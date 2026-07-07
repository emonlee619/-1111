import os
import json
import re
import urllib.error
import urllib.request
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from neo4j import GraphDatabase
from typing import List, Optional, Dict, Any
import nl_query_engine

app = FastAPI(title="煤矿瓦斯灾害知识库 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "coalgas123")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

class IndicatorResponse(BaseModel):
    id: str
    name: str
    symbol: Optional[str] = ""
    threshold: Optional[str] = ""
    weight: Optional[float] = 0.0
    scoring_rule: Optional[str] = ""
    description: Optional[str] = ""
    category: Optional[str] = ""
    region: Optional[str] = ""
    risk_level: Optional[str] = ""
    type: Optional[str] = ""

class GraphNode(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    properties: Optional[Dict[str, Any]] = {}

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class AiAnswerRequest(BaseModel):
    question: str
    top_k: int = 8

class EvidenceItem(BaseModel):
    id: str
    title: str
    source_type: str
    content: str
    metadata: Optional[Dict[str, Any]] = {}

class AiAnswerResponse(BaseModel):
    question: str
    mode: str
    answer: str
    citations: List[EvidenceItem]
    structured_query: Dict[str, Any]
    evidence_count: int
    warning: Optional[str] = None

def _extract_search_terms(question: str) -> List[str]:
    question = question.strip()
    terms = []
    for match in re.findall(r"[DS]\d{2}|[A-Za-z0-9_]+|[\u4e00-\u9fff]{2,}", question):
        if len(match) >= 2:
            terms.append(match)
    domain_terms = [
        "瓦斯", "超限", "突出", "通风", "抽采", "地质", "应力", "红色", "重大",
        "风险", "指标", "阈值", "管控", "措施", "标准", "案例", "事故",
    ]
    terms.extend([term for term in domain_terms if term in question])
    deduped = []
    for term in terms:
        if term not in deduped:
            deduped.append(term)
    return deduped[:12]

def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()

def _build_evidence_item(
    source_type: str,
    item_id: Any,
    title: Any,
    content_parts: List[Any],
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    content = "；".join([_safe_text(part) for part in content_parts if _safe_text(part)])
    return {
        "id": _safe_text(item_id) or f"{source_type}-unknown",
        "title": _safe_text(title) or _safe_text(item_id) or source_type,
        "source_type": source_type,
        "content": content or "知识库存在该条目，但正文摘要暂未维护。",
        "metadata": metadata or {},
    }

def _collect_answer_evidence(question: str, top_k: int) -> Dict[str, Any]:
    engine = nl_query_engine.NLQueryEngine()
    try:
        parsed = engine.parse_query(question)
    finally:
        engine.close()
    terms = _extract_search_terms(question)
    evidence: List[Dict[str, Any]] = []

    with driver.session() as session:
        indicator_id = parsed.get("params", {}).get("indicator_id")
        if indicator_id:
            records = session.run("""
                MATCH (i:Indicator {id: $indicator_id})
                OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
                OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
                OPTIONAL MATCH (i)-[:APPLIES_TO]->(r)
                RETURN i.id AS id, i.name AS name, i.threshold AS threshold,
                       i.description AS description, i.scoring_rule AS scoring_rule,
                       c.name AS category, rl.level AS risk_level, r.name AS region
                LIMIT 5
            """, indicator_id=indicator_id)
        else:
            records = session.run("""
                MATCH (i:Indicator)
                OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
                OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
                OPTIONAL MATCH (i)-[:APPLIES_TO]->(r)
                WHERE size($terms) = 0
                   OR any(term IN $terms WHERE
                        toLower(i.id) CONTAINS toLower(term)
                        OR i.name CONTAINS term
                        OR coalesce(i.description, '') CONTAINS term
                        OR coalesce(i.threshold, '') CONTAINS term
                        OR coalesce(c.name, '') CONTAINS term
                        OR coalesce(rl.level, '') CONTAINS term)
                RETURN i.id AS id, i.name AS name, i.threshold AS threshold,
                       i.description AS description, i.scoring_rule AS scoring_rule,
                       c.name AS category, rl.level AS risk_level, r.name AS region
                ORDER BY i.id
                LIMIT $limit
            """, terms=terms, limit=top_k)

        for record in records:
            evidence.append(_build_evidence_item(
                "indicator",
                record["id"],
                record["name"],
                [
                    f"指标编号 {record['id']}",
                    f"分类 {record['category']}" if record["category"] else "",
                    f"风险等级 {record['risk_level']}" if record["risk_level"] else "",
                    f"阈值 {record['threshold']}" if record["threshold"] else "",
                    record["description"],
                    f"评分规则 {record['scoring_rule']}" if record["scoring_rule"] else "",
                    f"适用区域 {record['region']}" if record["region"] else "",
                ],
                {"category": record["category"], "risk_level": record["risk_level"]},
            ))

        rule_records = session.run("""
            MATCH (r:Rule)-[:REQUIRES]->(m:Measure)
            OPTIONAL MATCH (m)-[:BASED_ON]->(s:Standard)
            WHERE size($terms) = 0
               OR any(term IN $terms WHERE
                    coalesce(r.id, '') CONTAINS term
                    OR coalesce(r.hazard_name, '') CONTAINS term
                    OR coalesce(r.attribute, '') CONTAINS term
                    OR coalesce(m.content, '') CONTAINS term
                    OR coalesce(m.source, '') CONTAINS term
                    OR coalesce(s.name, '') CONTAINS term)
            RETURN r.id AS rule_id, r.hazard_id AS hazard_id, r.hazard_name AS hazard_name,
                   r.attribute AS attribute, r.suggested_risk_level AS risk_level,
                   m.id AS measure_id, m.content AS measure, m.source AS source,
                   s.name AS standard
            ORDER BY r.id
            LIMIT $limit
        """, terms=terms, limit=top_k)

        for record in rule_records:
            evidence.append(_build_evidence_item(
                "rule_measure",
                record["rule_id"] or record["measure_id"],
                record["hazard_name"] or record["measure_id"],
                [
                    f"危险源 {record['hazard_name']}" if record["hazard_name"] else "",
                    f"属性 {record['attribute']}" if record["attribute"] else "",
                    f"建议风险等级 {record['risk_level']}" if record["risk_level"] else "",
                    f"管控措施 {record['measure']}" if record["measure"] else "",
                    f"来源 {record['source']}" if record["source"] else "",
                    f"依据标准 {record['standard']}" if record["standard"] else "",
                ],
                {"hazard_id": record["hazard_id"], "standard": record["standard"]},
            ))

        case_records = session.run("""
            MATCH (a:Accident:Case)
            WHERE any(term IN $terms WHERE
                coalesce(a.name, '') CONTAINS term
                OR coalesce(a.direct_cause, '') CONTAINS term
                OR coalesce(a.lessons, '') CONTAINS term
                OR coalesce(a.accident_type, '') CONTAINS term)
            RETURN a.case_id AS case_id, a.name AS name, a.accident_date AS date,
                   a.mine_type AS mine_type, a.accident_type AS accident_type,
                   a.direct_cause AS direct_cause, a.lessons AS lessons
            ORDER BY a.accident_date DESC
            LIMIT $limit
        """, terms=terms, limit=max(3, top_k // 2))

        for record in case_records:
            evidence.append(_build_evidence_item(
                "case",
                record["case_id"],
                record["name"],
                [
                    f"日期 {record['date']}" if record["date"] else "",
                    f"矿井类型 {record['mine_type']}" if record["mine_type"] else "",
                    f"事故类型 {record['accident_type']}" if record["accident_type"] else "",
                    f"直接原因 {record['direct_cause']}" if record["direct_cause"] else "",
                    f"经验教训 {record['lessons']}" if record["lessons"] else "",
                ],
                {"date": _safe_text(record["date"]), "accident_type": record["accident_type"]},
            ))

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for item in evidence:
        key = (item["source_type"], item["id"], item["title"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return {"parsed": parsed, "terms": terms, "evidence": deduped[: max(top_k, 1) * 2]}

def _fallback_answer(question: str, evidence: List[Dict[str, Any]], warning: str) -> Dict[str, Any]:
    if not evidence:
        answer = (
            "当前知识库没有检索到足够证据，不能给出精确结论。请补充指标编号、风险类型、"
            "区域或事故场景后再查询；正式处置仍需由安全管理人员复核。"
        )
    else:
        lines = [
            "已基于知识库检索结果生成结构化摘要，DeepSeek 未参与本次合成：",
            f"问题：{question}",
            "可用依据：",
        ]
        for index, item in enumerate(evidence[:5], start=1):
            lines.append(f"{index}. [{item['source_type']}] {item['title']}：{item['content']}")
        lines.append("以上内容只作辅助解释，不能替代正式制度解释、现场安全判断或事故认定。")
        answer = "\n".join(lines)
    return {"mode": "retrieval_only", "answer": answer, "warning": warning}

def _call_deepseek(question: str, evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        return _fallback_answer(question, evidence, "未配置 DEEPSEEK_API_KEY，已返回知识库检索摘要。")

    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat").strip() or "deepseek-chat"
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip().rstrip("/")
    evidence_text = "\n".join(
        f"[{idx}] type={item['source_type']} id={item['id']} title={item['title']} content={item['content']}"
        for idx, item in enumerate(evidence[:12], start=1)
    )
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是煤矿瓦斯灾害知识库问答助手。只能依据给定知识库证据回答；"
                    "证据不足时明确说明不足。回答要包含：结论、依据、处置建议、需人工复核项。"
                    "不要编造法规条款、实时数据或生产结论。"
                ),
            },
            {
                "role": "user",
                "content": f"问题：{question}\n\n知识库证据：\n{evidence_text or '无'}",
            },
        ],
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not content:
            return _fallback_answer(question, evidence, "DeepSeek 返回为空，已返回知识库检索摘要。")
        return {"mode": f"deepseek:{model}", "answer": content, "warning": None}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        return _fallback_answer(question, evidence, f"DeepSeek 调用失败，已返回知识库检索摘要：{exc}")

@app.get("/api/indicators", response_model=List[IndicatorResponse], tags=["指标管理"])
async def get_indicators(
    indicator_type: Optional[str] = Query(None, description="动态/静态"),
    category: Optional[str] = Query(None, description="分类"),
    risk_level: Optional[str] = Query(None, description="风险等级"),
    keyword: Optional[str] = Query(None, description="关键词搜索")
):
    query = """
        MATCH (i:Indicator)
        OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
        OPTIONAL MATCH (i)-[:APPLIES_TO]->(r)
        OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
        WHERE 1=1
    """
    params = {}
    
    if indicator_type:
        if indicator_type == "动态":
            query += " AND i:DynamicIndicator"
        elif indicator_type == "静态":
            query += " AND i:StaticIndicator"
    
    if category:
        query += " AND c.name CONTAINS $category"
        params["category"] = category
    
    if risk_level:
        query += " AND rl.level CONTAINS $risk_level"
        params["risk_level"] = risk_level
    
    if keyword:
        query += " AND (i.name CONTAINS $keyword OR i.id CONTAINS $keyword)"
        params["keyword"] = keyword
    
    query += " RETURN i, c, r, rl ORDER BY i.id"
    
    with driver.session() as session:
        results = session.run(query, params)
        indicators = []
        for record in results:
            i = record['i']
            indicators.append({
                'id': i['id'],
                'name': i['name'],
                'symbol': i.get('symbol', ''),
                'threshold': i.get('threshold', ''),
                'weight': i.get('weight', 0.0),
                'scoring_rule': i.get('scoring_rule', ''),
                'description': i.get('description', ''),
                'category': record['c']['name'] if record['c'] else '',
                'region': record['r']['name'] if record['r'] else '',
                'risk_level': record['rl']['level'] if record['rl'] else '',
                'type': '动态' if 'DynamicIndicator' in i.labels else '静态'
            })
    return indicators

@app.get("/api/indicators/{indicator_id}", response_model=IndicatorResponse, tags=["指标管理"])
async def get_indicator_detail(indicator_id: str):
    with driver.session() as session:
        result = session.run("""
            MATCH (i:Indicator {id: $id})
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            OPTIONAL MATCH (i)-[:APPLIES_TO]->(r)
            OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
            RETURN i, c, r, rl
        """, id=indicator_id)
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="指标不存在")
        i = record['i']
        return {
            'id': i['id'],
            'name': i['name'],
            'symbol': i.get('symbol', ''),
            'threshold': i.get('threshold', ''),
            'weight': i.get('weight', 0.0),
            'scoring_rule': i.get('scoring_rule', ''),
            'description': i.get('description', ''),
            'category': record['c']['name'] if record['c'] else '',
            'region': record['r']['name'] if record['r'] else '',
            'risk_level': record['rl']['level'] if record['rl'] else '',
            'type': '动态' if 'DynamicIndicator' in i.labels else '静态'
        }

@app.get("/api/graph/indicators/{indicator_id}", response_model=GraphData, tags=["知识图谱"])
async def get_indicator_graph(indicator_id: str):
    with driver.session() as session:
        result = session.run("""
            MATCH (i:Indicator {id: $id})
            OPTIONAL MATCH (i)-[r1]->(n1)
            OPTIONAL MATCH (n1)-[r2]->(n2)
            RETURN i, r1, n1, r2, n2
        """, id=indicator_id)
        
        nodes = []
        edges = []
        node_ids = set()
        
        for record in result:
            if record['i'] and record['i']['id'] not in node_ids:
                node_ids.add(record['i']['id'])
                nodes.append({
                    'id': record['i']['id'],
                    'label': record['i']['name'],
                    'properties': {'type': 'indicator'}
                })
            
            if record['n1']:
                n1_id = record['n1']['name'] if 'name' in record['n1'] else str(id(record['n1']))
                if n1_id not in node_ids:
                    node_ids.add(n1_id)
                    node_labels = list(record['n1'].labels) if hasattr(record['n1'], 'labels') else []
                    nodes.append({
                        'id': n1_id,
                        'label': record['n1']['name'] if 'name' in record['n1'] else n1_id,
                        'properties': {'type': node_labels[0] if node_labels else 'unknown'}
                    })
                
                if record['r1']:
                    edges.append({
                        'source': record['i']['id'],
                        'target': n1_id,
                        'relationship': record['r1'].type,
                        'properties': {}
                    })
            
            if record['n2']:
                n2_id = record['n2']['name'] if 'name' in record['n2'] else str(id(record['n2']))
                if n2_id not in node_ids:
                    node_ids.add(n2_id)
                    node_labels = list(record['n2'].labels) if hasattr(record['n2'], 'labels') else []
                    nodes.append({
                        'id': n2_id,
                        'label': record['n2']['name'] if 'name' in record['n2'] else n2_id,
                        'properties': {'type': node_labels[0] if node_labels else 'unknown'}
                    })
                
                if record['r2'] and record['n1']:
                    source_id = record['n1']['name'] if 'name' in record['n1'] else str(id(record['n1']))
                    edges.append({
                        'source': source_id,
                        'target': n2_id,
                        'relationship': record['r2'].type,
                        'properties': {}
                    })
        
        return {'nodes': nodes, 'edges': edges}

@app.get("/api/graph/category/{category_name}", response_model=GraphData, tags=["知识图谱"])
async def get_category_graph(category_name: str):
    with driver.session() as session:
        result = session.run("""
            MATCH (c:Category {name: $name})<-[:BELONGS_TO]-(i:Indicator)
            OPTIONAL MATCH (i)-[r]->(n)
            RETURN c, i, r, n
        """, name=category_name)
        
        nodes = []
        edges = []
        node_ids = set()
        
        for record in result:
            if record['c']:
                c_id = record['c']['name']
                if c_id not in node_ids:
                    node_ids.add(c_id)
                    nodes.append({
                        'id': c_id,
                        'label': record['c']['name'],
                        'properties': {'type': 'category'}
                    })
            
            if record['i']:
                if record['i']['id'] not in node_ids:
                    node_ids.add(record['i']['id'])
                    nodes.append({
                        'id': record['i']['id'],
                        'label': record['i']['name'],
                        'properties': {'type': 'indicator'}
                    })
                
                edges.append({
                    'source': record['i']['id'],
                    'target': record['c']['name'],
                    'relationship': 'BELONGS_TO',
                    'properties': {}
                })
            
            if record['n']:
                n_id = record['n']['name'] if 'name' in record['n'] else str(id(record['n']))
                if n_id not in node_ids:
                    node_ids.add(n_id)
                    node_labels = list(record['n'].labels) if hasattr(record['n'], 'labels') else []
                    nodes.append({
                        'id': n_id,
                        'label': record['n']['name'] if 'name' in record['n'] else n_id,
                        'properties': {'type': node_labels[0] if node_labels else 'unknown'}
                    })
                
                if record['r'] and record['i']:
                    edges.append({
                        'source': record['i']['id'],
                        'target': n_id,
                        'relationship': record['r'].type,
                        'properties': {}
                    })
        
        return {'nodes': nodes, 'edges': edges}

@app.get("/api/risk/high-risk", response_model=List[IndicatorResponse], tags=["风险评估"])
async def get_high_risk_indicators():
    with driver.session() as session:
        results = session.run("""
            MATCH (i:Indicator)-[:TRIGGERS]->(rl:RiskLevel {level: '红/重大风险'})
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            OPTIONAL MATCH (i)-[:APPLIES_TO]->(r)
            RETURN i, c, r, rl ORDER BY i.id
        """)
        indicators = []
        for record in results:
            i = record['i']
            indicators.append({
                'id': i['id'],
                'name': i['name'],
                'symbol': i.get('symbol', ''),
                'threshold': i.get('threshold', ''),
                'weight': i.get('weight', 0.0),
                'scoring_rule': i.get('scoring_rule', ''),
                'description': i.get('description', ''),
                'category': record['c']['name'] if record['c'] else '',
                'region': record['r']['name'] if record['r'] else '',
                'risk_level': record['rl']['level'] if record['rl'] else '',
                'type': '动态' if 'DynamicIndicator' in i.labels else '静态'
            })
    return indicators

@app.get("/api/categories", tags=["分类管理"])
async def get_categories():
    with driver.session() as session:
        results = session.run("MATCH (c:Category) RETURN c.name ORDER BY c.name")
        return [r['c.name'] for r in results]

@app.get("/api/regions", tags=["区域管理"])
async def get_regions():
    with driver.session() as session:
        results = session.run("MATCH (r:Region) RETURN r.name ORDER BY r.name")
        return [r['r.name'] for r in results]

@app.get("/api/rules/{indicator_id}", tags=["风险规则库"])
async def get_indicator_rules(indicator_id: str):
    """获取指标对应的风险规则和管控措施"""
    with driver.session() as session:
        result = session.run("""
            MATCH (i:Indicator {id: $id})-[:HAS_RULE]->(r:Rule)-[:REQUIRES]->(m:Measure)
            OPTIONAL MATCH (m)-[:BASED_ON]->(s:Standard)
            RETURN r, m, s
            ORDER BY r.id
        """, id=indicator_id)
        
        rules = []
        for record in result:
            rules.append({
                'rule_id': record['r']['id'],
                'hazard_id': record['r']['hazard_id'],
                'hazard_name': record['r']['hazard_name'],
                'attribute': record['r'].get('attribute', ''),
                'suggested_risk_level': record['r'].get('suggested_risk_level', ''),
                'measure': {
                    'id': record['m']['id'],
                    'content': record['m']['content'],
                    'source': record['m'].get('source', '')
                },
                'standard': record['s']['name'] if record['s'] else ''
            })
        return rules

@app.get("/api/measures", tags=["风险规则库"])
async def get_all_measures(
    keyword: Optional[str] = Query(None, description="关键词搜索")
):
    """获取所有管控措施"""
    with driver.session() as session:
        if keyword:
            result = session.run("""
                MATCH (m:Measure)
                WHERE m.content CONTAINS $keyword OR m.source CONTAINS $keyword
                RETURN m
                ORDER BY m.id
            """, keyword=keyword)
        else:
            result = session.run("""
                MATCH (m:Measure)
                RETURN m
                ORDER BY m.id
            """)
        
        measures = []
        for record in result:
            measures.append({
                'id': record['m']['id'],
                'content': record['m']['content'],
                'source': record['m'].get('source', ''),
                'version': record['m'].get('version', '1.0')
            })
        return measures

@app.get("/api/rules", tags=["风险规则库"])
async def get_all_rules(
    risk_level: Optional[str] = Query(None, description="风险等级筛选")
):
    """获取所有风险规则"""
    with driver.session() as session:
        if risk_level:
            result = session.run("""
                MATCH (r:Rule)
                WHERE r.suggested_risk_level CONTAINS $risk_level
                RETURN r
                ORDER BY r.id
            """, risk_level=risk_level)
        else:
            result = session.run("""
                MATCH (r:Rule)
                RETURN r
                ORDER BY r.id
            """)
        
        rules = []
        for record in result:
            rules.append({
                'id': record['r']['id'],
                'hazard_id': record['r']['hazard_id'],
                'hazard_name': record['r']['hazard_name'],
                'attribute': record['r'].get('attribute', ''),
                'suggested_risk_level': record['r'].get('suggested_risk_level', ''),
                'version': record['r'].get('version', '1.0')
            })
        return rules

@app.get("/api/nl-query", tags=["自然语言查询"])
async def natural_language_query(
    q: str = Query(..., description="自然语言查询内容，例如：查询所有红色风险的指标")
):
    """
    自然语言查询接口
    支持不懂代码的人员通过中文自然语言查询知识库
    
    示例查询：
    - "查询所有红色风险的指标"
    - "查找重大风险的指标有哪些"
    - "瓦斯地质的指标有哪些"
    - "D01的管控措施是什么"
    - "怎么处理瓦斯超限"
    - "总共有多少指标"
    - "指标数量是多少"
    """
    try:
        engine = nl_query_engine.NLQueryEngine()
        result = engine.execute_query(q)
        engine.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nl-query/help", tags=["自然语言查询"])
async def nl_query_help():
    """
    获取自然语言查询帮助信息
    """
    return {
        "title": "自然语言查询使用帮助",
        "description": "您可以用日常中文描述您想查询的内容，系统会自动理解并返回结果",
        "examples": [
            {
                "query": "查询所有红色风险的指标",
                "description": "查找风险等级为红色的指标"
            },
            {
                "query": "查找重大风险的指标有哪些", 
                "description": "与上面相同，只是表述不同"
            },
            {
                "query": "瓦斯地质的指标有哪些",
                "description": "查找属于瓦斯地质分类的指标"
            },
            {
                "query": "D01的管控措施是什么",
                "description": "查询D01指标对应的管控措施和处置方法"
            },
            {
                "query": "怎么处理瓦斯超限",
                "description": "查询瓦斯超限相关的管控措施"
            },
            {
                "query": "总共有多少指标",
                "description": "统计指标总数和各分类数量"
            },
            {
                "query": "查找甲烷相关的指标",
                "description": "通过关键词搜索相关指标"
            },
            {
                "query": "D01依据什么标准",
                "description": "查询指标对应的法规标准依据"
            }
        ],
        "supported_intents": [
            "query_indicator - 查询指标",
            "query_by_risk - 按风险等级查询",
            "query_by_category - 按分类查询",
            "query_measure - 查询管控措施",
            "query_standard - 查询标准依据",
            "query_reason - 查询风险原因",
            "query_case - 查询案例库",
            "query_similar_case - 查询相似案例",
            "count - 统计数量"
        ]
    }

@app.post("/api/ai-answer", response_model=AiAnswerResponse, tags=["自然语言查询"])
async def ai_answer(request: AiAnswerRequest):
    """
    检索增强问答接口。

    服务端先从 Neo4j 知识库检索指标、风险规则、管控措施、标准与案例证据；
    配置 DEEPSEEK_API_KEY 后再调用 DeepSeek 生成引用式回答。
    未配置或调用失败时返回 retrieval_only 摘要，不把缺证据内容伪装成 AI 结论。
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    try:
        bundle = _collect_answer_evidence(question, min(max(request.top_k, 3), 12))
        evidence = bundle["evidence"]
        generation = _call_deepseek(question, evidence)
        return {
            "question": question,
            "mode": generation["mode"],
            "answer": generation["answer"],
            "citations": evidence,
            "structured_query": {
                "parsed": bundle["parsed"],
                "terms": bundle["terms"],
            },
            "evidence_count": len(evidence),
            "warning": generation.get("warning"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cases", tags=["案例库"])
async def get_cases(
    mine_type: Optional[str] = Query(None, description="矿井类型"),
    accident_type: Optional[str] = Query(None, description="事故类型"),
    keyword: Optional[str] = Query(None, description="关键词搜索")
):
    """查询事故案例"""
    with driver.session() as session:
        query = """
            MATCH (a:Accident:Case)
            WHERE 1=1
        """
        params = {}
        
        if mine_type:
            query += " AND a.mine_type CONTAINS $mine_type"
            params['mine_type'] = mine_type
        
        if accident_type:
            query += " AND a.accident_type CONTAINS $accident_type"
            params['accident_type'] = accident_type
        
        if keyword:
            query += " AND (a.name CONTAINS $keyword OR a.direct_cause CONTAINS $keyword OR a.lessons CONTAINS $keyword)"
            params['keyword'] = keyword
        
        query += " RETURN a ORDER BY a.accident_date DESC"
        
        result = session.run(query, params)
        
        cases = []
        for record in result:
            a = record['a']
            cases.append({
                'case_id': a['case_id'],
                'name': a['name'],
                'date': a['accident_date'],
                'mine_type': a['mine_type'],
                'accident_type': a['accident_type'],
                'casualties': a['casualties'],
                'direct_cause': a['direct_cause'],
                'effectiveness': a.get('effectiveness', ''),
                'lessons': a.get('lessons', '')
            })
        return cases

@app.get("/api/cases/{case_id}", tags=["案例库"])
async def get_case_detail(case_id: str):
    """获取案例详细信息"""
    with driver.session() as session:
        result = session.run("""
            MATCH (a:Accident:Case {case_id: $id})
            OPTIONAL MATCH (a)-[:RELATED_TO]->(i:Indicator)
            OPTIONAL MATCH (a)-[:OCCURRED_IN]->(m:MineType)
            OPTIONAL MATCH (a)-[:IS_TYPE]->(t:AccidentType)
            OPTIONAL MATCH (a)-[:CAUSED_BY]->(c:CauseFactor)
            OPTIONAL MATCH (a)-[:SIMILAR_TO]->(other:Accident:Case)
            RETURN a, m, t, collect(DISTINCT i.id) as indicators, 
                   collect(DISTINCT c.name) as causes,
                   collect(DISTINCT other.name) as similar_cases
        """, id=case_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="案例不存在")
        
        a = record['a']
        return {
            'case_id': a['case_id'],
            'name': a['name'],
            'date': a['accident_date'],
            'mine_type': a['mine_type'],
            'coal_seam': a.get('coal_seam', ''),
            'depth': a.get('depth', 0),
            'gas_pressure': a.get('gas_pressure', 0),
            'gas_content': a.get('gas_content', 0),
            'f_coefficient': a.get('f_coefficient', 0),
            'accident_type': a['accident_type'],
            'casualties': a['casualties'],
            'direct_cause': a['direct_cause'],
            'indirect_causes': a.get('indirect_causes', []),
            'preventive_measures': a.get('preventive_measures', []),
            'rectification': a.get('rectification', []),
            'effectiveness': a.get('effectiveness', ''),
            'lessons': a.get('lessons', ''),
            'related_indicators': record['indicators'],
            'cause_factors': record['causes'],
            'similar_cases': record['similar_cases']
        }

@app.get("/api/cases/similar/{case_id}", tags=["案例库"])
async def get_similar_cases(case_id: str):
    """获取相似案例"""
    with driver.session() as session:
        result = session.run("""
            MATCH (a:Accident:Case {case_id: $id})-[r:SIMILAR_TO]-(other:Accident:Case)
            RETURN other, r.similarity_score as score
            ORDER BY score DESC
        """, id=case_id)
        
        cases = []
        for record in result:
            other = record['other']
            cases.append({
                'case_id': other['case_id'],
                'name': other['name'],
                'date': other['accident_date'],
                'mine_type': other['mine_type'],
                'accident_type': other['accident_type'],
                'similarity_score': record['score']
            })
        return cases

@app.get("/api/cases/by-indicator/{indicator_id}", tags=["案例库"])
async def get_cases_by_indicator(indicator_id: str):
    """获取与指标相关的案例"""
    with driver.session() as session:
        result = session.run("""
            MATCH (a:Accident:Case)-[:RELATED_TO]->(i:Indicator {id: $id})
            RETURN a
            ORDER BY a.accident_date DESC
        """, id=indicator_id)
        
        cases = []
        for record in result:
            a = record['a']
            cases.append({
                'case_id': a['case_id'],
                'name': a['name'],
                'date': a['accident_date'],
                'mine_type': a['mine_type'],
                'accident_type': a['accident_type'],
                'direct_cause': a['direct_cause']
            })
        return cases

@app.get("/api/causes", tags=["案例库"])
async def get_causes():
    """获取所有致因因素"""
    with driver.session() as session:
        result = session.run("MATCH (c:CauseFactor) RETURN c.name ORDER BY c.name")
        return [r['c.name'] for r in result]

@app.get("/api/accident-types", tags=["案例库"])
async def get_accident_types():
    """获取所有事故类型"""
    with driver.session() as session:
        result = session.run("MATCH (t:AccidentType) RETURN t.name ORDER BY t.name")
        return [r['t.name'] for r in result]

@app.get("/api/mine-types", tags=["案例库"])
async def get_mine_types():
    """获取所有矿井类型"""
    with driver.session() as session:
        result = session.run("MATCH (m:MineType) RETURN m.name ORDER BY m.name")
        return [r['m.name'] for r in result]

@app.get("/api/standards", tags=["标准库"])
async def get_standards(
    category: Optional[str] = Query(None, description="标准类别"),
    keyword: Optional[str] = Query(None, description="关键词搜索")
):
    """获取所有标准"""
    with driver.session() as session:
        query = """
            MATCH (s:Standard:Regulation)
            WHERE 1=1
        """
        params = {}
        
        if category:
            query += " AND s.category CONTAINS $category"
            params['category'] = category
        
        if keyword:
            query += " AND (s.name CONTAINS $keyword OR s.full_name CONTAINS $keyword)"
            params['keyword'] = keyword
        
        query += " RETURN s ORDER BY s.category, s.name"
        
        result = session.run(query, params)
        
        standards = []
        for record in result:
            s = record['s']
            standards.append({
                'std_id': s['std_id'],
                'name': s['name'],
                'full_name': s.get('full_name', ''),
                'category': s.get('category', ''),
                'version': s.get('version', ''),
                'issuing_org': s.get('issuing_org', '')
            })
        return standards

@app.get("/api/standards/{std_id}", tags=["标准库"])
async def get_standard_detail(std_id: str):
    """获取标准详细信息及条款"""
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Standard:Regulation {std_id: $id})
            OPTIONAL MATCH (s)-[:CONTAINS]->(c:Clause)
            RETURN s, collect(c) as clauses
        """, id=std_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="标准不存在")
        
        s = record['s']
        clauses = []
        for c in record['clauses']:
            if c:
                clauses.append({
                    'clause_id': c['clause_id'],
                    'clause_no': c.get('clause_no', ''),
                    'title': c.get('title', ''),
                    'content': c.get('content', ''),
                    'keywords': c.get('keywords', [])
                })
        
        return {
            'std_id': s['std_id'],
            'name': s['name'],
            'full_name': s.get('full_name', ''),
            'category': s.get('category', ''),
            'version': s.get('version', ''),
            'issuing_org': s.get('issuing_org', ''),
            'clauses': clauses
        }

@app.get("/api/standards/clause/{clause_id}", tags=["标准库"])
async def get_clause_detail(clause_id: str):
    """获取条款详细信息"""
    with driver.session() as session:
        result = session.run("""
            MATCH (c:Clause {clause_id: $id})
            OPTIONAL MATCH (s:Standard:Regulation)-[:CONTAINS]->(c)
            RETURN c, s
        """, id=clause_id)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="条款不存在")
        
        c = record['c']
        s = record['s']
        
        return {
            'clause_id': c['clause_id'],
            'clause_no': c.get('clause_no', ''),
            'title': c.get('title', ''),
            'content': c.get('content', ''),
            'keywords': c.get('keywords', []),
            'standard': {
                'std_id': s['std_id'],
                'name': s['name'],
                'full_name': s.get('full_name', '')
            } if s else None
        }

@app.get("/api/standards/by-indicator/{indicator_id}", tags=["标准库"])
async def get_standards_by_indicator(indicator_id: str):
    """获取与指标相关的标准/条款"""
    with driver.session() as session:
        result = session.run("""
            MATCH (i:Indicator {id: $id})-[r:REFERENCES]->(target)
            RETURN target, type(r) as rel_type
        """, id=indicator_id)
        
        standards = []
        clauses = []
        
        for record in result:
            target = record['target']
            rel_type = record['rel_type']
            
            if 'Clause' in target.labels:
                clauses.append({
                    'clause_id': target['clause_id'],
                    'clause_no': target.get('clause_no', ''),
                    'title': target.get('title', ''),
                    'content': target.get('content', '')
                })
            elif 'Regulation' in target.labels or 'Standard' in target.labels:
                standards.append({
                    'std_id': target['std_id'],
                    'name': target['name'],
                    'full_name': target.get('full_name', '')
                })
        
        return {
            'indicator': indicator_id,
            'standards': standards,
            'clauses': clauses
        }

@app.get("/api/standards/search", tags=["标准库"])
async def search_standards(
    keyword: str = Query(..., description="搜索关键词")
):
    """搜索标准条款"""
    with driver.session() as session:
        result = session.run("""
            MATCH (c:Clause)
            WHERE any(k IN c.keywords WHERE toLower(k) CONTAINS toLower($keyword))
               OR toLower(c.content) CONTAINS toLower($keyword)
               OR toLower(c.title) CONTAINS toLower($keyword)
            OPTIONAL MATCH (s:Standard:Regulation)-[:CONTAINS]->(c)
            RETURN c, s
            ORDER BY s.category, c.clause_no
            LIMIT 20
        """, keyword=keyword)
        
        results = []
        for record in result:
            c = record['c']
            s = record['s']
            results.append({
                'clause_id': c['clause_id'],
                'clause_no': c.get('clause_no', ''),
                'title': c.get('title', ''),
                'content': c.get('content', ''),
                'keywords': c.get('keywords', []),
                'standard': {
                    'std_id': s['std_id'],
                    'name': s['name']
                } if s else None
            })
        
        return {
            'keyword': keyword,
            'count': len(results),
            'results': results
        }

# ==================== 动态更新机制 API ====================

class VersionInfo(BaseModel):
    entity_type: str  # Indicator, Rule, Measure, Standard, Clause
    entity_id: str
    old_version: str
    new_version: str
    change_type: str  # create, update, delete
    change_content: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None

@app.post("/api/version/update", tags=["动态更新"])
async def create_version_record(info: VersionInfo):
    """
    创建版本更新记录
    用于追踪知识库内容的变更历史
    """
    with driver.session() as session:
        # 创建版本记录节点
        result = session.run("""
            CREATE (v:VersionRecord {
                id: randomUUID(),
                entity_type: $entity_type,
                entity_id: $entity_id,
                old_version: $old_version,
                new_version: $new_version,
                change_type: $change_type,
                change_content: $change_content,
                reason: $reason,
                created_at: datetime(),
                created_by: 'system'
            })
            RETURN v.id as id
        """,
            entity_type=info.entity_type,
            entity_id=info.entity_id,
            old_version=info.old_version,
            new_version=info.new_version,
            change_type=info.change_type,
            change_content=str(info.change_content) if info.change_content else None,
            reason=info.reason
        )
        record = result.single()
        return {'id': record['id'], 'message': '版本记录已创建'}

@app.get("/api/version/history", tags=["动态更新"])
async def get_version_history(
    entity_type: Optional[str] = Query(None, description="实体类型"),
    entity_id: Optional[str] = Query(None, description="实体ID"),
    limit: int = Query(50, description="返回记录数")
):
    """
    获取版本变更历史
    """
    with driver.session() as session:
        query = "MATCH (v:VersionRecord) WHERE 1=1"
        params = {'limit': limit}
        
        if entity_type:
            query += " AND v.entity_type = $entity_type"
            params['entity_type'] = entity_type
        
        if entity_id:
            query += " AND v.entity_id = $entity_id"
            params['entity_id'] = entity_id
        
        query += " RETURN v ORDER BY v.created_at DESC LIMIT $limit"
        
        result = session.run(query, params)
        
        records = []
        for record in result:
            v = record['v']
            records.append({
                'id': v['id'],
                'entity_type': v['entity_type'],
                'entity_id': v['entity_id'],
                'old_version': v['old_version'],
                'new_version': v['new_version'],
                'change_type': v['change_type'],
                'change_content': v.get('change_content'),
                'reason': v.get('reason'),
                'created_at': str(v.get('created_at', ''))
            })
        
        return records

@app.get("/api/version/latest", tags=["动态更新"])
async def get_latest_version(entity_type: str = Query(..., description="实体类型")):
    """
    获取某类实体的最新版本号
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (v:VersionRecord {entity_type: $entity_type})
            RETURN v.entity_id, v.new_version, v.created_at
            ORDER BY v.created_at DESC
        """, entity_type=entity_type)
        
        versions = {}
        for record in result:
            entity_id = record['v.entity_id']
            if entity_id not in versions:
                versions[entity_id] = {
                    'entity_id': entity_id,
                    'version': record['v.new_version'],
                    'updated_at': str(record['v.created_at'])
                }
        
        return {'entity_type': entity_type, 'versions': list(versions.values())}

@app.post("/api/indicators", tags=["动态更新"])
async def create_indicator(indicator: Dict[str, Any]):
    """
    创建新指标（需要提供完整信息）
    """
    with driver.session() as session:
        # 验证必填字段
        required_fields = ['id', 'name']
        for field in required_fields:
            if field not in indicator:
                raise HTTPException(status_code=400, detail=f'缺少必填字段: {field}')
        
        # 创建指标节点
        session.run("""
            MERGE (i:Indicator {id: $id})
            SET i.name = $name,
                i.symbol = $symbol,
                i.unit = $unit,
                i.threshold = $threshold,
                i.description = $description,
                i.version = '1.0',
                i.created_at = datetime(),
                i.updated_at = datetime()
        """,
            id=indicator['id'],
            name=indicator['name'],
            symbol=indicator.get('symbol', ''),
            unit=indicator.get('unit', ''),
            threshold=indicator.get('threshold', ''),
            description=indicator.get('description', '')
        )
        
        # 创建版本记录
        session.run("""
            CREATE (v:VersionRecord {
                id: randomUUID(),
                entity_type: 'Indicator',
                entity_id: $id,
                old_version: 'none',
                new_version: '1.0',
                change_type: 'create',
                change_content: $content,
                reason: '新建指标',
                created_at: datetime(),
                created_by: 'api'
            })
        """, id=indicator['id'], content=str(indicator))
        
        return {'message': '指标创建成功', 'id': indicator['id']}

@app.put("/api/indicators/{indicator_id}", tags=["动态更新"])
async def update_indicator(indicator_id: str, indicator: Dict[str, Any]):
    """
    更新指标信息
    """
    with driver.session() as session:
        # 获取旧版本
        result = session.run("MATCH (i:Indicator {id: $id}) RETURN i.version as v", id=indicator_id)
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail='指标不存在')
        
        old_version = record['v']
        # 计算新版本号
        version_parts = old_version.split('.')
        new_version = f"{version_parts[0]}.{int(version_parts[1]) + 1}"
        
        # 更新指标
        session.run("""
            MATCH (i:Indicator {id: $id})
            SET i.name = $name,
                i.symbol = $symbol,
                i.unit = $unit,
                i.threshold = $threshold,
                i.description = $description,
                i.version = $new_version,
                i.updated_at = datetime()
        """,
            id=indicator_id,
            name=indicator.get('name', ''),
            symbol=indicator.get('symbol', ''),
            unit=indicator.get('unit', ''),
            threshold=indicator.get('threshold', ''),
            description=indicator.get('description', ''),
            new_version=new_version
        )
        
        # 创建版本记录
        session.run("""
            CREATE (v:VersionRecord {
                id: randomUUID(),
                entity_type: 'Indicator',
                entity_id: $id,
                old_version: $old_version,
                new_version: $new_version,
                change_type: 'update',
                change_content: $content,
                reason: 'API更新',
                created_at: datetime(),
                created_by: 'api'
            })
        """, id=indicator_id, old_version=old_version, new_version=new_version, content=str(indicator))
        
        return {'message': '指标更新成功', 'old_version': old_version, 'new_version': new_version}

@app.delete("/api/indicators/{indicator_id}", tags=["动态更新"])
async def delete_indicator(indicator_id: str):
    """
    删除指标（标记为删除）
    """
    with driver.session() as session:
        # 获取旧版本
        result = session.run("MATCH (i:Indicator {id: $id}) RETURN i.version as v", id=indicator_id)
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail='指标不存在')
        
        old_version = record['v']
        
        # 标记删除（实际不删除，保留历史）
        session.run("""
            MATCH (i:Indicator {id: $id})
            SET i.deleted = true,
                i.deleted_at = datetime()
        """, id=indicator_id)
        
        # 创建版本记录
        session.run("""
            CREATE (v:VersionRecord {
                id: randomUUID(),
                entity_type: 'Indicator',
                entity_id: $id,
                old_version: $old_version,
                new_version: 'deleted',
                change_type: 'delete',
                change_content: null,
                reason: 'API删除',
                created_at: datetime(),
                created_by: 'api'
            })
        """, id=indicator_id, old_version=old_version)
        
        return {'message': '指标已删除'}

@app.get("/api/stats", tags=["统计信息"])
async def get_stats():
    """
    获取知识库统计信息
    """
    with driver.session() as session:
        stats = {}
        
        # 指标统计
        result = session.run("MATCH (i:Indicator) WHERE i.deleted IS NULL OR NOT i.deleted RETURN count(i) as cnt")
        stats['total_indicators'] = result.single()['cnt']
        
        result = session.run("MATCH (i:DynamicIndicator) WHERE i.deleted IS NULL OR NOT i.deleted RETURN count(i) as cnt")
        stats['dynamic_indicators'] = result.single()['cnt']
        
        result = session.run("MATCH (i:StaticIndicator) WHERE i.deleted IS NULL OR NOT i.deleted RETURN count(i) as cnt")
        stats['static_indicators'] = result.single()['cnt']
        
        # 风险规则统计
        result = session.run("MATCH (r:Rule) RETURN count(r) as cnt")
        stats['total_rules'] = result.single()['cnt']
        
        # 管控措施统计
        result = session.run("MATCH (m:Measure) RETURN count(m) as cnt")
        stats['total_measures'] = result.single()['cnt']
        
        # 案例统计
        result = session.run("MATCH (a:Accident:Case) RETURN count(a) as cnt")
        stats['total_cases'] = result.single()['cnt']
        
        # 标准统计
        result = session.run("MATCH (s:Standard:Regulation) RETURN count(s) as cnt")
        stats['total_standards'] = result.single()['cnt']
        
        result = session.run("MATCH (c:Clause) RETURN count(c) as cnt")
        stats['total_clauses'] = result.single()['cnt']
        
        # 版本记录统计
        result = session.run("MATCH (v:VersionRecord) RETURN count(v) as cnt")
        stats['total_version_records'] = result.single()['cnt']
        
        return stats

# ==================== 版本管理API ====================
try:
    from version_management import VersionManager, UpdateLogManager
    version_manager = VersionManager(driver)
    update_log_manager = UpdateLogManager(driver)
    version_mgmt_available = True
except Exception as e:
    version_mgmt_available = False
    version_manager = None
    update_log_manager = None
    print(f"version_management 模块未加载（如需启用版本管理/更新日志接口请补齐 version_management.py）: {e}")

@app.get("/api/version/history/{entity_type}/{entity_id}", tags=["版本管理"])
async def get_version_history(entity_type: str, entity_id: str, limit: int = 10):
    """
    获取实体的版本历史
    
    参数:
        entity_type: 实体类型（Indicator/Standard/Measure/Case）
        entity_id: 实体ID
        limit: 返回数量
    """
    history = version_manager.get_version_history(entity_type, entity_id, limit) if version_mgmt_available else []
    return {"value": history, "count": len(history)}

@app.get("/api/version/detail/{version_id}", tags=["版本管理"])
async def get_version_detail(version_id: str):
    """获取版本详情"""
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    detail = version_manager.get_version_detail(version_id)
    if not detail:
        raise HTTPException(status_code=404, detail="版本记录不存在")
    return detail

@app.post("/api/version/rollback", tags=["版本管理"])
async def rollback_version(entity_type: str, entity_id: str, 
                           target_version: int, rollback_by: str,
                           rollback_reason: str):
    """
    回滚到指定版本
    
    参数:
        entity_type: 实体类型
        entity_id: 实体ID
        target_version: 目标版本号
        rollback_by: 回滚操作人
        rollback_reason: 回滚原因
    """
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    result = version_manager.rollback_to_version(
        entity_type, entity_id, target_version, rollback_by, rollback_reason
    )
    return result

@app.get("/api/version/compare", tags=["版本管理"])
async def compare_versions(entity_type: str, entity_id: str,
                           version1: int, version2: int):
    """
    对比两个版本
    
    参数:
        entity_type: 实体类型
        entity_id: 实体ID
        version1: 版本号1
        version2: 版本号2
    """
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    result = version_manager.compare_versions(entity_type, entity_id, version1, version2)
    return result

@app.get("/api/version/records", tags=["版本管理"])
async def get_all_version_records(limit: int = 50):
    """获取所有版本记录"""
    records = version_manager.get_all_version_records(limit) if version_mgmt_available else []
    return {"value": records, "count": len(records)}

@app.post("/api/version/update-indicator", tags=["版本管理"])
async def update_indicator_with_version(indicator_id: str, new_data: Dict,
                                        change_reason: str, changed_by: str):
    """
    更新指标并创建版本记录
    
    参数:
        indicator_id: 指标ID
        new_data: 新数据（JSON格式）
        change_reason: 变更原因
        changed_by: 变更人
    """
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    result = version_manager.update_indicator_with_version(
        indicator_id, new_data, change_reason, changed_by
    )
    return result

@app.post("/api/version/update-standard", tags=["版本管理"])
async def update_standard_with_version(standard_id: str, new_data: Dict,
                                       change_reason: str, changed_by: str):
    """
    更新标准并创建版本记录
    """
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    result = version_manager.update_standard_with_version(
        standard_id, new_data, change_reason, changed_by
    )
    return result

@app.get("/api/update-logs", tags=["更新日志"])
async def get_update_logs(update_type: str = None, 
                         start_date: str = None,
                         end_date: str = None,
                         limit: int = 100):
    """
    获取更新日志
    
    参数:
        update_type: 更新类型过滤
        start_date: 开始日期（YYYY-MM-DD）
        end_date: 结束日期（YYYY-MM-DD）
        limit: 返回数量
    """
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    logs = update_log_manager.get_update_logs(update_type, start_date, end_date, limit)
    return {"value": logs, "count": len(logs)}

@app.get("/api/update-logs/statistics", tags=["更新日志"])
async def get_update_statistics():
    """获取更新统计"""
    if not version_mgmt_available:
        raise HTTPException(status_code=503, detail="版本管理模块未加载")
    stats = update_log_manager.get_update_statistics()
    return stats

# ==================== PostgreSQL静态数据存储API ====================
try:
    from postgres_storage import PostgreSQLManager, StaticDataManager, FuzzyEvaluationManager, RiskRecordManager
    
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB = os.getenv("POSTGRES_DB", "coalgas_warning")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    
    pg_manager = PostgreSQLManager(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        database=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD
    )
    static_data_manager = StaticDataManager(pg_manager)
    fuzzy_eval_manager = FuzzyEvaluationManager(pg_manager)
    risk_record_manager = RiskRecordManager(pg_manager)
    
    pg_available = True
except Exception as e:
    pg_available = False
    print(f"PostgreSQL连接失败: {e}")

@app.get("/api/pg/status", tags=["PostgreSQL存储"])
async def get_pg_status():
    """获取PostgreSQL连接状态"""
    return {
        "available": pg_available,
        "message": "PostgreSQL服务正常运行" if pg_available else "PostgreSQL服务未连接"
    }

@app.post("/api/pg/static-data", tags=["PostgreSQL存储"])
async def insert_static_data(data: Dict):
    """
    插入静态数据
    
    参数:
        data: 静态数据字典（JSON格式）
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    try:
        record_id = static_data_manager.insert_static_data(data)
        return {"success": True, "record_id": record_id, "message": "数据插入成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pg/static-data/{mine_id}", tags=["PostgreSQL存储"])
async def get_static_data_by_mine(mine_id: str, limit: int = 10):
    """
    获取矿井静态数据
    
    参数:
        mine_id: 矿井ID
        limit: 返回数量
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    data = static_data_manager.get_static_data_by_mine(mine_id, limit)
    return {"value": data, "count": len(data)}

@app.get("/api/pg/static-data/latest/{mine_id}", tags=["PostgreSQL存储"])
async def get_latest_static_data(mine_id: str):
    """获取矿井最新静态数据"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    data = static_data_manager.get_latest_static_data(mine_id)
    if not data:
        raise HTTPException(status_code=404, detail="未找到数据")
    return data

@app.get("/api/pg/high-risk-mines", tags=["PostgreSQL存储"])
async def get_high_risk_mines(threshold_d: float = 0.25, threshold_k: float = 20):
    """
    获取高危矿井列表
    
    参数:
        threshold_d: D指标阈值
        threshold_k: K指标阈值
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    mines = static_data_manager.get_high_risk_mines(threshold_d, threshold_k)
    return {"value": mines, "count": len(mines)}

@app.get("/api/pg/red-line-data", tags=["PostgreSQL存储"])
async def get_red_line_data(limit: int = 50):
    """获取触发红线的数据"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    data = static_data_manager.get_red_line_data(limit)
    return {"value": data, "count": len(data)}

@app.get("/api/pg/evaluation/history/{mine_id}", tags=["PostgreSQL存储"])
async def get_evaluation_history(mine_id: str, limit: int = 10):
    """获取矿井评价历史"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    history = fuzzy_eval_manager.get_evaluation_history(mine_id, limit)
    return {"value": history, "count": len(history)}

@app.get("/api/pg/evaluation/latest/{mine_id}", tags=["PostgreSQL存储"])
async def get_latest_evaluation(mine_id: str):
    """获取矿井最新评价结果"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    eval_result = fuzzy_eval_manager.get_latest_evaluation(mine_id)
    if not eval_result:
        raise HTTPException(status_code=404, detail="未找到评价记录")
    return eval_result

@app.get("/api/pg/evaluation/red-line", tags=["PostgreSQL存储"])
async def get_red_line_evaluations(limit: int = 50):
    """获取触发红线的评价记录"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    evaluations = fuzzy_eval_manager.get_red_line_evaluations(limit)
    return {"value": evaluations, "count": len(evaluations)}

@app.get("/api/pg/evaluation/statistics", tags=["PostgreSQL存储"])
async def get_risk_statistics(start_date: str = None, end_date: str = None):
    """
    获取风险统计
    
    参数:
        start_date: 开始日期（YYYY-MM-DD）
        end_date: 结束日期（YYYY-MM-DD）
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    from datetime import datetime as dt
    start = dt.strptime(start_date, "%Y-%m-%d") if start_date else None
    end = dt.strptime(end_date, "%Y-%m-%d") if end_date else None
    
    stats = fuzzy_eval_manager.get_risk_statistics(start, end)
    return stats

@app.get("/api/pg/evaluation/trend/{mine_id}", tags=["PostgreSQL存储"])
async def get_trend_analysis(mine_id: str, days: int = 30):
    """
    获取趋势分析数据
    
    参数:
        mine_id: 矿井ID
        days: 天数
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    trend = fuzzy_eval_manager.get_trend_analysis(mine_id, days)
    return {"value": trend, "count": len(trend)}

@app.get("/api/pg/risk-records/{mine_id}", tags=["PostgreSQL存储"])
async def get_risk_records_by_mine(mine_id: str, status: str = None, limit: int = 50):
    """
    获取矿井风险记录
    
    参数:
        mine_id: 矿井ID
        status: 状态过滤（未处理/已处理）
        limit: 返回数量
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    records = risk_record_manager.get_risk_records_by_mine(mine_id, status, limit)
    return {"value": records, "count": len(records)}

@app.get("/api/pg/risk-records/unhandled", tags=["PostgreSQL存储"])
async def get_unhandled_risks(limit: int = 100):
    """获取未处理的风险记录"""
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    risks = risk_record_manager.get_unhandled_risks(limit)
    return {"value": risks, "count": len(risks)}

@app.put("/api/pg/risk-records/{record_id}/status", tags=["PostgreSQL存储"])
async def update_risk_status(record_id: int, status: str,
                             handled_by: str = None,
                             handle_result: str = None):
    """
    更新风险记录状态
    
    参数:
        record_id: 记录ID
        status: 新状态
        handled_by: 处理人
        handle_result: 处理结果
    """
    if not pg_available:
        raise HTTPException(status_code=503, detail="PostgreSQL服务未连接")
    
    success = risk_record_manager.update_risk_status(record_id, status, handled_by, handle_result)
    return {"success": success, "message": "状态更新成功" if success else "更新失败"}

# ==================== 模糊数学评价API ====================
try:
    from fuzzy_evaluation import fuzzy_comprehensive_evaluation
    fuzzy_eval_available = True
except Exception as e:
    fuzzy_eval_available = False
    print(f"模糊评价模块加载失败: {e}")

class FuzzyEvaluationRequest(BaseModel):
    """模糊评价请求模型"""
    mine_id: str
    coal_gas_pressure: float
    coal_firmness: float
    gas_diffusion_velocity: float
    burial_depth: float
    geological_structure: int
    fault_distance: float
    structure_distance: float
    danger_indicator_d: float
    danger_indicator_k: float
    coal_thickness: float
    dip_angle: float
    spontaneous_combustion: int
    ventilation_system_type: int
    gas_extraction_qualified: bool
    gas_extraction_continuity: bool
    wind_speed_alarm_count: int
    fan_feeder_abnormal_count: int
    power_cutoff_failure_count: int
    gas_sensor_overrun_duration: float
    gas_sensor_overrun_count: int
    power_cutoff_miss_count: int
    gas_inspector_violation_count: int
    ventilation_violation_count: int
    training_rate: float
    certificate_rate: float
    safety_cost_per_ton: float
    gas_level: int
    ignition_management: bool
    fire_prevention_design: bool
    support_material_flammable: bool
    dust_explosion_index: float
    gas_explosion_hazard_count: int
    accident_history: bool = False
    accident_severity: int = 0
    prevention_measure_scores: Dict = None

@app.post("/api/static/risk-assessment", tags=["模糊评价"])
async def risk_assessment(request: FuzzyEvaluationRequest):
    """
    静态风险评估接口 - 模糊数学评价
    
    输入32个静态实测值，返回综合评分S（0~100），供后续TFT动态模型调用
    综合风险 = 0.25 * S + 0.75 * 动态预警概率
    
    参数:
        request: 包含32个静态指标的请求体
    """
    if not fuzzy_eval_available:
        raise HTTPException(status_code=503, detail="模糊评价模块未加载")
    
    eval_data = {
        "煤层瓦斯压力": request.coal_gas_pressure,
        "煤坚固性系数": request.coal_firmness,
        "瓦斯放散初速度": request.gas_diffusion_velocity,
        "煤层埋藏深度": request.burial_depth,
        "地质构造": request.geological_structure,
        "断层距工作面距离": request.fault_distance,
        "工作面与构造带距离": request.structure_distance,
        "突出危险性综合指标D": request.danger_indicator_d,
        "突出危险性综合指标K": request.danger_indicator_k,
        "煤层厚度": request.coal_thickness,
        "煤层倾角": request.dip_angle,
        "煤层自燃倾向性": request.spontaneous_combustion,
        "主通风系统合理性": request.ventilation_system_type,
        "瓦斯抽采效果检验达标": request.gas_extraction_qualified,
        "瓦斯抽采效果接续合理": request.gas_extraction_continuity,
        "风速异常报警次数": request.wind_speed_alarm_count,
        "局部通风机馈电异常次数": request.fan_feeder_abnormal_count,
        "甲烷电风电闭锁失效次数": request.power_cutoff_failure_count,
        "瓦斯传感器超限时长": request.gas_sensor_overrun_duration,
        "瓦斯传感器超限次数": request.gas_sensor_overrun_count,
        "应断未断电次数": request.power_cutoff_miss_count,
        "瓦检员空班漏检假检次数": request.gas_inspector_violation_count,
        "通风专业瓦斯相关三违数量": request.ventilation_violation_count,
        "安全培训率": request.training_rate,
        "持证上岗率": request.certificate_rate,
        "吨煤安全费用提取": request.safety_cost_per_ton,
        "矿井瓦斯等级": request.gas_level,
        "火源管理合规": request.ignition_management,
        "有防灭火设计": request.fire_prevention_design,
        "支护材料可燃": request.support_material_flammable,
        "煤尘爆炸指数": request.dust_explosion_index,
        "瓦斯爆炸类隐患数量": request.gas_explosion_hazard_count,
        "事故历史": (request.accident_history, request.accident_severity),
        "综合防治措施": request.prevention_measure_scores or {}
    }
    
    try:
        result = fuzzy_comprehensive_evaluation(eval_data)
        
        static_risk_index_s = result.get("综合评分", 0) / 100.0
        
        return {
            "success": True,
            "mine_id": request.mine_id,
            "static_risk_index_s": static_risk_index_s,
            "composite_score": result.get("综合评分", 0),
            "risk_level": result.get("风险等级", "未知"),
            "red_line_triggered": result.get("红线触发", False),
            "red_line_reason": result.get("红线原因", ""),
            "fuzzy_vector_b": result.get("模糊向量B", []),
            "max_membership_level": result.get("最大隶属度等级", ""),
            "max_membership_value": result.get("最大隶属度值", 0),
            "indicator_scores": result.get("各项评分", {}),
            "description": "静态本底风险指数S，用于与TFT动态模型融合：综合风险 = 0.25 * S + 0.75 * 动态预警概率"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"评价计算失败: {str(e)}")

@app.get("/", tags=["首页"])
async def root():
    return {
        "message": "煤矿瓦斯灾害知识库 API 服务运行中",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "features": [
            "知识库查询",
            "自然语言查询",
            "DeepSeek检索增强问答",
            "版本管理",
            "更新日志",
            "PostgreSQL静态数据存储",
            "模糊评价结果存储",
            "风险记录管理",
            "静态风险评估API"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
