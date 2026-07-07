"""
自然语言查询引擎
让非技术人员通过中文自然语言查询知识库
"""

import os
import re
from dotenv import load_dotenv

load_dotenv()

from neo4j import GraphDatabase
from typing import Dict, List, Any, Optional

class NLQueryEngine:
    def __init__(self):
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "coalgas123")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        
        # 意图识别规则
        self.intent_patterns = {
            'query_indicator': [
                r'(?:查询|找|查找|看看|显示|列出)(?:哪些?|什么|.*)指标',
                r'指标(?:有哪些|是什么|多少)',
                r'(?:有哪些|什么)危险源',
            ],
            'query_by_risk': [
                r'(?:红色|橙色|黄色|蓝色|重大|较大|一般|低风险)(?:的|类)?(?:指标|危险源)',
                r'(?:触发|引发)(?:红色|橙色|黄色|蓝色|重大|较大|一般|低风险)',
                r'(?:重大|较大|一般|低)(?:风险)?(?:的)?(?:指标)?',
            ],
            'query_by_category': [
                r'(?:瓦斯地质|通风抽采|应力地压|采掘扰动|环境监测|监测监控|人员管理|综合安全)(?:类)?(?:的|)?(?:指标)?',
                r'(?:哪|哪些)指标属于(.+)类',
            ],
            'query_by_threshold': [
                r'(?:阈值|指标值|数值)(?:是|为|多少)',
                r'(?:大于|小于|超过|达到)(?:多少|什么)',
            ],
            'query_measure': [
                r'(?:管控|管理|处置|预防|防治)(?:措施|方法|手段)?',
                r'(?:怎么办|如何处理|怎么处理|怎么应对)',
                r'应该(?:怎么|如何)(?:做|处理|应对)',
            ],
            'query_standard': [
                r'(?:依据|根据|按照)(?:哪个|什么|哪些)标准',
                r'(?:标准|规程|规定|细则)',
                r'出自(?:哪个|什么)法规',
            ],
            'query_reason': [
                r'(?:原因|致因|为什么|为何)(?:是|因为)',
                r'会导致?(?:什么|哪些)',
            ],
            'count': [
                r'(?:多少|数量|有几个|有几条|总数)',
                r'总共有(?:多少|几)',
            ],
            'query_case': [
                r'案例',
                r'事故',
                r'历史',
                r'经验',
                r'教训',
                r'学习',
            ],
            'similar_case': [
                r'相似案例',
                r'类似的事故',
                r'历史(?:案例|事故|经验)',
            ]
        }
        
        # 风险等级映射
        self.risk_mapping = {
            '红色': '红/重大风险',
            '重大': '红/重大风险',
            '红': '红/重大风险',
            'orange': '橙/较大风险',
            '橙色': '橙/较大风险',
            '较大': '橙/较大风险',
            '橙': '橙/较大风险',
            '黄色': '黄/一般风险',
            '一般': '黄/一般风险',
            '黄': '黄/一般风险',
            '蓝色': '蓝/低风险',
            '低风险': '蓝/低风险',
            '低': '蓝/低风险',
        }
        
        # 分类映射
        self.category_mapping = {
            '瓦斯地质': '瓦斯地质',
            '通风抽采': '通风抽采',
            '应力地压': '应力地压',
            '采掘扰动': '采掘扰动',
            '环境监测': '环境监测',
            '监测监控': '监测监控',
            '人员管理': '人员管理',
            '综合安全': '综合安全耦合',
        }

    def close(self):
        self.driver.close()

    def parse_query(self, query: str) -> Dict[str, Any]:
        """解析自然语言查询，返回意图和参数"""
        query = query.strip()
        result = {
            'original_query': query,
            'intent': 'unknown',
            'params': {},
            'filters': {}
        }
        
        # 意图识别
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query):
                    result['intent'] = intent
                    break
            if result['intent'] != 'unknown':
                break
        
        # 提取风险等级
        for keyword, level in self.risk_mapping.items():
            if keyword in query:
                result['filters']['risk_level'] = level
                break
        
        # 提取分类
        for keyword, category in self.category_mapping.items():
            if keyword in query:
                result['filters']['category'] = category
                break
        
        # 提取指标ID
        id_match = re.search(r'([DS])(\d{2})', query)
        if id_match:
            result['params']['indicator_id'] = f"{id_match.group(1)}{id_match.group(2)}"
        
        # 提取关键词
        keywords = re.findall(r'[\w]+', query)
        result['params']['keywords'] = [k for k in keywords if len(k) >= 2]
        
        return result

    def execute_query(self, query: str) -> Dict[str, Any]:
        """执行自然语言查询"""
        parsed = self.parse_query(query)
        intent = parsed['intent']
        params = parsed['params']
        filters = parsed['filters']
        
        with self.driver.session() as session:
            # 根据意图执行不同查询
            if intent == 'query_indicator':
                return self._query_indicators(session, params, filters)
            elif intent == 'query_by_risk':
                return self._query_by_risk(session, filters)
            elif intent == 'query_by_category':
                return self._query_by_category(session, filters)
            elif intent == 'query_measure':
                return self._query_measures(session, params)
            elif intent == 'query_standard':
                return self._query_standards(session, params)
            elif intent == 'query_reason':
                return self._query_reasons(session, params)
            elif intent == 'count':
                return self._count_all(session)
            elif intent == 'query_case':
                return self._query_cases(session, params)
            elif intent == 'similar_case':
                return self._query_similar_cases(session, params)
            else:
                return self._general_query(session, params)

    def _query_indicators(self, session, params: Dict, filters: Dict) -> Dict:
        """查询指标列表"""
        cypher = """
            MATCH (i:Indicator)
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
            WHERE 1=1
        """
        params_cypher = {}
        
        if 'risk_level' in filters:
            cypher += " AND rl.level = $risk_level"
            params_cypher['risk_level'] = filters['risk_level']
        
        if 'category' in filters:
            cypher += " AND c.name CONTAINS $category"
            params_cypher['category'] = filters['category']
        
        if 'indicator_id' in params:
            cypher += " AND i.id = $indicator_id"
            params_cypher['indicator_id'] = params['indicator_id']
        
        cypher += " RETURN i.id, i.name, i.symbol, i.threshold, c.name as category, rl.level as risk_level ORDER BY i.id"
        
        result = session.run(cypher, params_cypher)
        
        indicators = []
        for record in result:
            indicators.append({
                '编号': record['i.id'],
                '名称': record['i.name'],
                '符号': record['i.symbol'] or '',
                '阈值': record['i.threshold'] or '',
                '分类': record['category'] or '',
                '风险等级': record['risk_level'] or ''
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '查询指标',
            'count': len(indicators),
            'results': indicators
        }

    def _query_by_risk(self, session, filters: Dict) -> Dict:
        """按风险等级查询"""
        risk_level = filters.get('risk_level', '红/重大风险')
        
        result = session.run("""
            MATCH (i:Indicator)-[:TRIGGERS]->(rl:RiskLevel {level: $level})
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            RETURN i.id, i.name, i.threshold, c.name as category
            ORDER BY i.id
        """, level=risk_level)
        
        indicators = []
        for record in result:
            indicators.append({
                '编号': record['i.id'],
                '名称': record['i.name'],
                '阈值': record['i.threshold'] or '',
                '分类': record['category'] or ''
            })
        
        return {
            'query': filters.get('original_query', ''),
            'intent': f'查询{risk_level}指标',
            'risk_level': risk_level,
            'count': len(indicators),
            'results': indicators
        }

    def _query_by_category(self, session, filters: Dict) -> Dict:
        """按分类查询"""
        category = filters.get('category', '')
        
        result = session.run("""
            MATCH (c:Category {name: $category})<-[:BELONGS_TO]-(i:Indicator)
            OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
            RETURN i.id, i.name, i.threshold, rl.level as risk_level
            ORDER BY i.id
        """, category=category)
        
        indicators = []
        for record in result:
            indicators.append({
                '编号': record['i.id'],
                '名称': record['i.name'],
                '阈值': record['i.threshold'] or '',
                '风险等级': record['risk_level'] or ''
            })
        
        return {
            'query': filters.get('original_query', ''),
            'intent': f'查询{category}类指标',
            'category': category,
            'count': len(indicators),
            'results': indicators
        }

    def _query_measures(self, session, params: Dict) -> Dict:
        """查询管控措施"""
        indicator_id = params.get('indicator_id', '')
        
        if indicator_id:
            result = session.run("""
                MATCH (i:Indicator {id: $id})-[:HAS_RULE]->(r:Rule)-[:REQUIRES]->(m:Measure)
                OPTIONAL MATCH (m)-[:BASED_ON]->(s:Standard)
                RETURN i.name as indicator, r.hazard_name, m.content as measure, m.source as source, s.name as standard
            """, id=indicator_id)
        else:
            result = session.run("""
                MATCH (r:Rule)-[:REQUIRES]->(m:Measure)
                OPTIONAL MATCH (m)-[:BASED_ON]->(s:Standard)
                RETURN r.hazard_name, m.content as measure, m.source as source, s.name as standard
                LIMIT 20
            """)
        
        measures = []
        for record in result:
            measures.append({
                '危险源': record.get('hazard_name') or record.get('indicator', ''),
                '管控措施': record.get('measure', ''),
                '来源依据': record.get('source', '') or '',
                '适用标准': record.get('standard', '') or ''
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '查询管控措施',
            'indicator': indicator_id,
            'count': len(measures),
            'results': measures
        }

    def _query_standards(self, session, params: Dict) -> Dict:
        """查询标准依据"""
        indicator_id = params.get('indicator_id', '')
        
        if indicator_id:
            result = session.run("""
                MATCH (i:Indicator {id: $id})-[:HAS_RULE]->(r:Rule)-[:REQUIRES]->(m:Measure)
                OPTIONAL MATCH (m)-[:BASED_ON]->(s:Standard)
                RETURN DISTINCT s.name as standard, m.source as source
            """, id=indicator_id)
        else:
            result = session.run("""
                MATCH (s:Standard)
                RETURN s.name as standard
            """)
        
        standards = []
        for record in result:
            standards.append({
                '标准名称': record['standard'] or '',
                '来源': record['source'] or ''
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '查询标准依据',
            'count': len(standards),
            'results': standards
        }

    def _query_reasons(self, session, params: Dict) -> Dict:
        """查询风险原因"""
        indicator_id = params.get('indicator_id', '')
        
        result = session.run("""
            MATCH (i:Indicator {id: $id})
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            RETURN i.id, i.name, i.description, c.name as category
        """, id=indicator_id)
        
        record = result.single()
        if record:
            return {
                'query': params.get('original_query', ''),
                'intent': '查询风险原因',
                'indicator': indicator_id,
                'reason': record['description'] or '暂无详细描述',
                'category': record['category'] or ''
            }
        return {
            'query': params.get('original_query', ''),
            'intent': '查询风险原因',
            'indicator': indicator_id,
            'reason': '未找到相关信息'
        }

    def _query_cases(self, session, params: Dict) -> Dict:
        """查询案例库"""
        indicator_id = params.get('indicator_id', '')
        keywords = params.get('keywords', [])
        
        if indicator_id:
            # 查询与特定指标相关的案例
            result = session.run("""
                MATCH (a:Accident:Case)-[:RELATED_TO]->(i:Indicator {id: $id})
                RETURN a.case_id as case_id, a.name as name, a.accident_date as date,
                       a.mine_type as mine_type, a.accident_type as accident_type,
                       a.direct_cause as cause, a.lessons as lessons
                ORDER BY a.accident_date DESC
            """, id=indicator_id)
        else:
            # 查询所有案例
            result = session.run("""
                MATCH (a:Accident:Case)
                RETURN a.case_id as case_id, a.name as name, a.accident_date as date,
                       a.mine_type as mine_type, a.accident_type as accident_type,
                       a.direct_cause as cause, a.lessons as lessons
                ORDER BY a.accident_date DESC
                LIMIT 20
            """)
        
        cases = []
        for record in result:
            cases.append({
                'case_id': record['case_id'],
                'name': record['name'],
                'date': record['date'],
                'mine_type': record['mine_type'],
                'accident_type': record['accident_type'],
                'direct_cause': record['cause'] or '',
                'lessons': record['lessons'] or ''
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '查询案例',
            'indicator': indicator_id,
            'count': len(cases),
            'results': cases
        }

    def _count_all(self, session) -> Dict:
        """统计数量"""
        total = session.run("MATCH (i:Indicator) RETURN count(i) as cnt").single()['cnt']
        dynamic = session.run("MATCH (i:DynamicIndicator) RETURN count(i) as cnt").single()['cnt']
        static = session.run("MATCH (i:StaticIndicator) RETURN count(i) as cnt").single()['cnt']
        measures = session.run("MATCH (m:Measure) RETURN count(m) as cnt").single()['cnt']
        rules = session.run("MATCH (r:Rule) RETURN count(r) as cnt").single()['cnt']
        cases = session.run("MATCH (a:Accident:Case) RETURN count(a) as cnt").single()['cnt']
        
        return {
            'query': '',
            'intent': '统计数据',
            'counts': {
                '指标总数': total,
                '动态指标': dynamic,
                '静态指标': static,
                '管控措施': measures,
                '风险规则': rules,
                '案例总数': cases
            }
        }

    def _query_similar_cases(self, session, params: Dict) -> Dict:
        """查询相似案例"""
        indicator_id = params.get('indicator_id', '')
        
        if not indicator_id:
            # 没有指标ID，返回一个提示
            return {
                'query': params.get('original_query', ''),
                'intent': '相似案例查询',
                'message': '请指定指标ID，例如："查询D01的相似案例"',
                'results': []
            }
        
        # 先找到与该指标相关的案例
        result = session.run("""
            MATCH (a:Accident:Case)-[:RELATED_TO]->(i:Indicator {id: $id})
            RETURN a.case_id as case_id
        """, id=indicator_id)
        
        related_case_ids = [r['case_id'] for r in result]
        
        if not related_case_ids:
            return {
                'query': params.get('original_query', ''),
                'intent': '相似案例查询',
                'indicator': indicator_id,
                'message': f'未找到与{indicator_id}相关的历史案例',
                'results': []
            }
        
        # 找到与这些案例相似的其他案例
        similar_result = session.run("""
            MATCH (a1:Accident:Case)-[r:SIMILAR_TO]-(a2:Accident:Case)
            WHERE a1.case_id IN $case_ids AND NOT a2.case_id IN $case_ids
            RETURN a2.case_id as case_id, a2.name as name, a2.accident_date as date,
                   a2.mine_type as mine_type, a2.accident_type as accident_type,
                   r.similarity_score as score
            ORDER BY score DESC
            LIMIT 5
        """, case_ids=related_case_ids)
        
        cases = []
        for record in similar_result:
            cases.append({
                'case_id': record['case_id'],
                'name': record['name'],
                'date': record['date'],
                'mine_type': record['mine_type'],
                'accident_type': record['accident_type'],
                'similarity_score': record['score']
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '相似案例查询',
            'indicator': indicator_id,
            'count': len(cases),
            'results': cases
        }

    def _general_query(self, session, params: Dict) -> Dict:
        """通用查询 - 关键词搜索"""
        keywords = params.get('keywords', [])
        
        if not keywords:
            return {
                'query': params.get('original_query', ''),
                'intent': '通用查询',
                'message': '请明确查询内容，例如："查询所有红色风险的指标"',
                'results': []
            }
        
        # 用第一个关键词搜索
        keyword = keywords[0]
        result = session.run("""
            MATCH (i:Indicator)
            WHERE i.name CONTAINS $keyword OR i.description CONTAINS $keyword
            OPTIONAL MATCH (i)-[:BELONGS_TO]->(c)
            OPTIONAL MATCH (i)-[:TRIGGERS]->(rl)
            RETURN i.id, i.name, i.description, c.name as category, rl.level as risk_level
            LIMIT 20
        """, keyword=keyword)
        
        indicators = []
        for record in result:
            indicators.append({
                '编号': record['i.id'],
                '名称': record['i.name'],
                '描述': record['i.description'] or '',
                '分类': record['category'] or '',
                '风险等级': record['risk_level'] or ''
            })
        
        return {
            'query': params.get('original_query', ''),
            'intent': '关键词搜索',
            'keyword': keyword,
            'count': len(indicators),
            'results': indicators
        }

# 测试
if __name__ == '__main__':
    engine = NLQueryEngine()
    
    test_queries = [
        "查询所有红色风险的指标",
        "查找重大风险的指标有哪些",
        "瓦斯地质的指标有哪些",
        "D01的管控措施是什么",
        "查找甲烷相关的指标",
        "总共有多少指标",
        "指标数量是多少",
        "怎么处理瓦斯超限",
        "有哪些管控措施",
        "D01依据什么标准",
    ]
    
    print("=" * 60)
    print("自然语言查询测试")
    print("=" * 60)
    
    for query in test_queries:
        print(f"\n>>> {query}")
        result = engine.execute_query(query)
        print(f"意图: {result['intent']}")
        print(f"数量: {result.get('count', result.get('counts', {}))}")
        if result.get('results'):
            print(f"第一条: {result['results'][0]}")
    
    engine.close()