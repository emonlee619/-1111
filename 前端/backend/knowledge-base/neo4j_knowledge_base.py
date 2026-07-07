"""
煤矿瓦斯灾害知识库图数据库系统
基于 Neo4j 构建风险规则库、案例库、标准库

功能模块：
1. 风险规则库：动态/静态指标、阈值、风险等级、管控措施
2. 案例库：事故案例、致因分析、相似案例匹配
3. 标准库：法规标准、条款索引、合规性判断
"""

import os
from dotenv import load_dotenv

load_dotenv()

from neo4j import GraphDatabase
from typing import Dict, List, Optional, Tuple, Any
import json
from datetime import datetime


class Neo4jKnowledgeBase:
    """Neo4j知识库核心类"""
    
    def __init__(self, uri: str = None, 
                 user: str = None, 
                 password: str = None):
        """
        初始化Neo4j连接
        
        参数:
            uri: Neo4j服务器地址（默认从环境变量读取）
            user: 用户名（默认从环境变量读取）
            password: 密码（默认从环境变量读取）
        """
        uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = user or os.getenv("NEO4J_USER", "neo4j")
        password = password or os.getenv("NEO4J_PASSWORD", "coalgas123")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.uri = uri
        self.user = user
        
    def close(self):
        """关闭数据库连接"""
        self.driver.close()
        
    def execute_query(self, query: str, parameters: Dict = None) -> List[Dict]:
        """
        执行Cypher查询
        
        参数:
            query: Cypher查询语句
            parameters: 查询参数
        
        返回:
            查询结果列表
        """
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def execute_write(self, query: str, parameters: Dict = None) -> None:
        """
        执行Cypher写入操作
        
        参数:
            query: Cypher写入语句
            parameters: 写入参数
        """
        with self.driver.session() as session:
            session.run(query, parameters or {})
    
    def clear_database(self):
        """清空数据库（谨慎使用）"""
        self.execute_write("MATCH (n) DETACH DELETE n")
        print("数据库已清空")
    
    def create_indexes(self):
        """创建索引以提高查询效率"""
        indexes = [
            # 指标索引
            "CREATE INDEX indicator_id_index IF NOT EXISTS FOR (i:Indicator) ON (i.id)",
            "CREATE INDEX indicator_name_index IF NOT EXISTS FOR (i:Indicator) ON (i.name)",
            
            # 动态指标索引
            "CREATE INDEX dynamic_indicator_id_index IF NOT EXISTS FOR (i:DynamicIndicator) ON (i.id)",
            
            # 静态指标索引
            "CREATE INDEX static_indicator_id_index IF NOT EXISTS FOR (i:StaticIndicator) ON (i.id)",
            
            # 风险等级索引
            "CREATE INDEX risk_level_index IF NOT EXISTS FOR (r:RiskLevel) ON (r.level)",
            
            # 法规标准索引
            "CREATE INDEX standard_id_index IF NOT EXISTS FOR (s:Standard) ON (s.id)",
            "CREATE INDEX standard_name_index IF NOT EXISTS FOR (s:Standard) ON (s.name)",
            
            # 条款索引
            "CREATE INDEX clause_number_index IF NOT EXISTS FOR (c:Clause) ON (c.number)",
            
            # 事故案例索引
            "CREATE INDEX accident_id_index IF NOT EXISTS FOR (a:Accident) ON (a.id)",
            "CREATE INDEX accident_date_index IF NOT EXISTS FOR (a:Accident) ON (a.date)",
            
            # 隐患索引
            "CREATE INDEX hazard_id_index IF NOT EXISTS FOR (h:Hazard) ON (h.id)",
            
            # 分类索引
            "CREATE INDEX category_name_index IF NOT EXISTS FOR (c:Category) ON (c.name)",
            
            # 措施索引
            "CREATE INDEX measure_id_index IF NOT EXISTS FOR (m:Measure) ON (m.id)"
        ]
        
        for index_query in indexes:
            try:
                self.execute_write(index_query)
            except Exception as e:
                print(f"索引创建警告: {e}")
        
        print("索引创建完成")
    
    def init_schema(self):
        """
        初始化知识库Schema
        创建基础节点类型和约束
        """
        # 清空现有数据（可选）
        # self.clear_database()
        
        # 创建索引
        self.create_indexes()
        
        # 创建基础分类节点
        categories = [
            {"name": "瓦斯地质类", "type": "dynamic", "description": "瓦斯涌出与解吸相关指标"},
            {"name": "应力地压类", "type": "dynamic", "description": "煤岩应力与破裂相关指标"},
            {"name": "采掘扰动类", "type": "dynamic", "description": "采掘作业扰动相关指标"},
            {"name": "环境监测类", "type": "dynamic", "description": "环境参数监测指标"},
            {"name": "通风抽采类", "type": "static", "description": "通风与瓦斯抽采系统指标"},
            {"name": "监测监控类", "type": "static", "description": "监测监控系统指标"},
            {"name": "人员管理类", "type": "static", "description": "人员管理相关指标"},
            {"name": "综合安全耦合类", "type": "static", "description": "综合安全耦合指标"},
            {"name": "作业组织类", "type": "static", "description": "作业组织相关指标"}
        ]
        
        for cat in categories:
            self.execute_write(
                "MERGE (c:Category {name: $name}) "
                "SET c.type = $type, c.description = $description",
                cat
            )
        
        # 创建风险等级节点
        risk_levels = [
            {"level": "红", "name": "重大风险", "color": "#FF0000", "priority": 1},
            {"level": "橙", "name": "较大风险", "color": "#FFA500", "priority": 2},
            {"level": "黄", "name": "一般风险", "color": "#FFFF00", "priority": 3},
            {"level": "蓝", "name": "低风险", "color": "#0000FF", "priority": 4}
        ]
        
        for rl in risk_levels:
            self.execute_write(
                "MERGE (r:RiskLevel {level: $level}) "
                "SET r.name = $name, r.color = $color, r.priority = $priority",
                rl
            )
        
        # 创建区域节点
        regions = [
            {"name": "采煤工作面", "description": "采煤作业区域"},
            {"name": "掘进工作面", "description": "掘进作业区域"},
            {"name": "回风巷", "description": "回风巷道区域"},
            {"name": "上隅角", "description": "采煤工作面上隅角"},
            {"name": "抽采系统", "description": "瓦斯抽采系统区域"},
            {"name": "应力集中区", "description": "地应力集中区域"},
            {"name": "构造带邻近区域", "description": "地质构造带邻近区域"},
            {"name": "全矿井", "description": "全矿井范围"},
            {"name": "采掘工作面及回风系统", "description": "采掘工作面及回风系统区域"}
        ]
        
        for reg in regions:
            self.execute_write(
                "MERGE (r:Region {name: $name}) "
                "SET r.description = $description",
                reg
            )
        
        print("Schema初始化完成")


class RiskRuleLibrary:
    """风险规则库管理类"""
    
    def __init__(self, kb: Neo4jKnowledgeBase):
        self.kb = kb
    
    def add_dynamic_indicator(self, indicator_data: Dict) -> None:
        """
        添加动态指标
        
        参数:
            indicator_data: 指标数据字典，包含:
                - id: 指标编号（如D01）
                - name: 指标名称
                - symbol: 符号/单位
                - threshold: 阈值描述
                - category: 专业分类
                - region: 适用区域
                - description: 危险源描述
                - risk_level: 建议风险等级
                - source: 来源依据
        """
        query = """
        CREATE (i:Indicator:DynamicIndicator {
            id: $id,
            name: $name,
            symbol: $symbol,
            threshold: $threshold,
            description: $description,
            source: $source,
            created_at: datetime(),
            version: '1.0'
        })
        WITH i
        MATCH (c:Category {name: $category})
        MERGE (i)-[:BELONGS_TO]->(c)
        WITH i
        MATCH (r:Region {name: $region})
        MERGE (i)-[:APPLIES_TO]->(r)
        WITH i
        MATCH (rl:RiskLevel {level: $risk_level})
        MERGE (i)-[:TRIGGERS]->(rl)
        """
        self.kb.execute_write(query, indicator_data)
    
    def add_static_indicator(self, indicator_data: Dict) -> None:
        """
        添加静态指标
        
        参数:
            indicator_data: 指标数据字典，包含:
                - id: 指标编号（如S01）
                - name: 指标名称
                - weight: 权重
                - scoring_rule: 评分标准
                - category: 专业分类
                - region: 适用区域
                - description: 危险源描述
                - source: 来源依据
        """
        query = """
        CREATE (i:Indicator:StaticIndicator {
            id: $id,
            name: $name,
            weight: $weight,
            scoring_rule: $scoring_rule,
            description: $description,
            source: $source,
            created_at: datetime(),
            version: '1.0'
        })
        WITH i
        MATCH (c:Category {name: $category})
        MERGE (i)-[:BELONGS_TO]->(c)
        WITH i
        MATCH (r:Region {name: $region})
        MERGE (i)-[:APPLIES_TO]->(r)
        """
        self.kb.execute_write(query, indicator_data)
    
    def add_threshold(self, indicator_id: str, threshold_data: Dict) -> None:
        """
        为指标添加阈值
        
        参数:
            indicator_id: 指标编号
            threshold_data: 阈值数据，包含:
                - value: 阈值值
                - condition: 条件描述（如">=", "<"）
                - action: 触发动作（如"报警", "断电"）
                - risk_level: 对应风险等级
        """
        query = """
        MATCH (i:Indicator {id: $indicator_id})
        CREATE (t:Threshold {
            value: $value,
            condition: $condition,
            action: $action,
            created_at: datetime()
        })
        MERGE (i)-[:HAS_THRESHOLD]->(t)
        WITH t
        MATCH (rl:RiskLevel {level: $risk_level})
        MERGE (t)-[:MAPS_TO]->(rl)
        """
        params = {"indicator_id": indicator_id, **threshold_data}
        self.kb.execute_write(query, params)
    
    def add_measure(self, measure_data: Dict) -> None:
        """
        添加管控措施
        
        参数:
            measure_data: 措施数据，包含:
                - id: 措施编号
                - name: 措施名称
                - content: 措施内容
                - source: 来源依据
                - applicable_indicators: 适用指标列表
        """
        query = """
        CREATE (m:Measure {
            id: $id,
            name: $name,
            content: $content,
            source: $source,
            created_at: datetime(),
            version: '1.0'
        })
        """
        self.kb.execute_write(query, measure_data)
        
        # 关联适用指标
        for ind_id in measure_data.get("applicable_indicators", []):
            self.kb.execute_write(
                "MATCH (m:Measure {id: $measure_id}) "
                "MATCH (i:Indicator {id: $indicator_id}) "
                "MERGE (i)-[:REQUIRES]->(m)",
                {"measure_id": measure_data["id"], "indicator_id": ind_id}
            )
    
    def link_indicator_to_standard(self, indicator_id: str, standard_name: str, clause_number: str = None) -> None:
        """
        关联指标与法规标准
        
        参数:
            indicator_id: 指标编号
            standard_name: 法规标准名称
            clause_number: 条款编号（可选）
        """
        if clause_number:
            query = """
            MATCH (i:Indicator {id: $indicator_id})
            MATCH (s:Standard {name: $standard_name})
            MATCH (c:Clause {number: $clause_number})-[:BELONGS_TO]->(s)
            MERGE (i)-[:BASED_ON]->(c)
            """
        else:
            query = """
            MATCH (i:Indicator {id: $indicator_id})
            MATCH (s:Standard {name: $standard_name})
            MERGE (i)-[:REFERENCES]->(s)
            """
        self.kb.execute_write(query, {
            "indicator_id": indicator_id,
            "standard_name": standard_name,
            "clause_number": clause_number
        })
    
    def get_indicator_by_id(self, indicator_id: str) -> Dict:
        """根据ID获取指标详情"""
        query = """
        MATCH (i:Indicator {id: $id})
        OPTIONAL MATCH (i)-[:BELONGS_TO]->(c:Category)
        OPTIONAL MATCH (i)-[:APPLIES_TO]->(r:Region)
        OPTIONAL MATCH (i)-[:TRIGGERS]->(rl:RiskLevel)
        OPTIONAL MATCH (i)-[:HAS_THRESHOLD]->(t:Threshold)
        OPTIONAL MATCH (i)-[:REQUIRES]->(m:Measure)
        OPTIONAL MATCH (i)-[:BASED_ON]->(cl:Clause)-[:BELONGS_TO]->(s:Standard)
        RETURN i, c, r, rl, collect(t) as thresholds, collect(m) as measures, collect(cl) as clauses, collect(s) as standards
        """
        result = self.kb.execute_query(query, {"id": indicator_id})
        return result[0] if result else None
    
    def get_all_dynamic_indicators(self) -> List[Dict]:
        """获取所有动态指标"""
        query = """
        MATCH (i:DynamicIndicator)
        OPTIONAL MATCH (i)-[:BELONGS_TO]->(c:Category)
        OPTIONAL MATCH (i)-[:APPLIES_TO]->(r:Region)
        OPTIONAL MATCH (i)-[:TRIGGERS]->(rl:RiskLevel)
        RETURN i.id as id, i.name as name, i.symbol as symbol, i.threshold as threshold,
               i.description as description, i.source as source,
               c.name as category, r.name as region, rl.level as risk_level
        ORDER BY i.id
        """
        return self.kb.execute_query(query)
    
    def get_all_static_indicators(self) -> List[Dict]:
        """获取所有静态指标"""
        query = """
        MATCH (i:StaticIndicator)
        OPTIONAL MATCH (i)-[:BELONGS_TO]->(c:Category)
        OPTIONAL MATCH (i)-[:APPLIES_TO]->(r:Region)
        RETURN i.id as id, i.name as name, i.weight as weight, i.scoring_rule as scoring_rule,
               i.description as description, i.source as source,
               c.name as category, r.name as region
        ORDER BY i.id
        """
        return self.kb.execute_query(query)
    
    def get_indicators_by_risk_level(self, risk_level: str) -> List[Dict]:
        """根据风险等级获取指标"""
        query = """
        MATCH (i:Indicator)-[:TRIGGERS]->(rl:RiskLevel {level: $level})
        RETURN i.id as id, i.name as name, i.description as description
        """
        return self.kb.execute_query(query, {"level": risk_level})
    
    def get_measures_for_indicator(self, indicator_id: str) -> List[Dict]:
        """获取指标对应的管控措施"""
        query = """
        MATCH (i:Indicator {id: $id})-[:REQUIRES]->(m:Measure)
        RETURN m.id as id, m.name as name, m.content as content, m.source as source
        """
        return self.kb.execute_query(query, {"id": indicator_id})
    
    def update_indicator_version(self, indicator_id: str, new_data: Dict, version: str) -> None:
        """
        更新指标版本
        
        参数:
            indicator_id: 指标编号
            new_data: 新数据
            version: 新版本号
        """
        query = """
        MATCH (i:Indicator {id: $id})
        SET i.version = $version, i.updated_at = datetime()
        SET i += $new_data
        """
        params = {"id": indicator_id, "version": version, "new_data": new_data}
        self.kb.execute_write(query, params)


class CaseLibrary:
    """案例库管理类"""
    
    def __init__(self, kb: Neo4jKnowledgeBase):
        self.kb = kb
    
    def add_accident_case(self, case_data: Dict) -> None:
        """
        添加事故案例
        
        参数:
            case_data: 案例数据，包含:
                - id: 案例编号
                - name: 事故名称
                - date: 发生日期
                - location: 发生地点
                - mine_type: 矿井类型
                - casualty_level: 伤亡等级
                - accident_type: 事故类型（瓦斯突出/瓦斯爆炸）
                - process: 事故经过
                - cause_analysis: 致因分析
                - prevention_measures: 防范措施
                - rectification_effect: 整改效果
        """
        query = """
        CREATE (a:Accident {
            id: $id,
            name: $name,
            date: date($date),
            location: $location,
            mine_type: $mine_type,
            casualty_level: $casualty_level,
            accident_type: $accident_type,
            process: $process,
            cause_analysis: $cause_analysis,
            prevention_measures: $prevention_measures,
            rectification_effect: $rectification_effect,
            created_at: datetime()
        })
        """
        self.kb.execute_write(query, case_data)
    
    def add_cause_factor(self, factor_name: str, factor_type: str) -> None:
        """
        添加致因因素
        
        参数:
            factor_name: 因素名称（如"瓦斯积聚"、"通风失效"）
            factor_type: 因素类型（技术/管理/人为）
        """
        query = """
        MERGE (f:CauseFactor {name: $name})
        SET f.type = $type
        """
        self.kb.execute_write(query, {"name": factor_name, "type": factor_type})
    
    def link_accident_to_cause(self, accident_id: str, cause_name: str, description: str = None) -> None:
        """
        关联事故与致因
        
        参数:
            accident_id: 事故编号
            cause_name: 致因名称
            description: 关联描述
        """
        query = """
        MATCH (a:Accident {id: $accident_id})
        MATCH (f:CauseFactor {name: $cause_name})
        MERGE (a)-[r:CAUSED_BY]->(f)
        SET r.description = $description
        """
        self.kb.execute_write(query, {
            "accident_id": accident_id,
            "cause_name": cause_name,
            "description": description
        })
    
    def link_accident_to_indicator(self, accident_id: str, indicator_id: str) -> None:
        """
        关联事故与指标（说明该指标与事故相关）
        """
        query = """
        MATCH (a:Accident {id: $accident_id})
        MATCH (i:Indicator {id: $indicator_id})
        MERGE (a)-[:INVOLVES]->(i)
        """
        self.kb.execute_write(query, {
            "accident_id": accident_id,
            "indicator_id": indicator_id
        })
    
    def find_similar_cases(self, accident_id: str) -> List[Dict]:
        """
        查找相似案例
        
        基于：相同矿井类型、相同致因因素、相同事故类型
        
        参数:
            accident_id: 参照事故编号
        
        返回:
            相似案例列表及相似度
        """
        query = """
        MATCH (a1:Accident {id: $id})
        MATCH (a2:Accident)
        WHERE a1 <> a2
        AND (a1.accident_type = a2.accident_type OR a1.mine_type = a2.mine_type)
        OPTIONAL MATCH (a1)-[:CAUSED_BY]->(f:CauseFactor)<-[:CAUSED_BY]-(a2)
        WITH a1, a2, count(f) as shared_causes
        WITH a2, shared_causes,
             CASE WHEN a1.accident_type = a2.accident_type THEN 1 ELSE 0 END as type_match,
             CASE WHEN a1.mine_type = a2.mine_type THEN 1 ELSE 0 END as mine_match
        RETURN a2.id as id, a2.name as name, a2.date as date, a2.location as location,
               (shared_causes * 0.4 + type_match * 0.3 + mine_match * 0.3) as similarity_score
        ORDER BY similarity_score DESC
        LIMIT 10
        """
        return self.kb.execute_query(query, {"id": accident_id})
    
    def get_cases_by_type(self, accident_type: str) -> List[Dict]:
        """根据事故类型获取案例"""
        query = """
        MATCH (a:Accident {accident_type: $type})
        RETURN a.id as id, a.name as name, a.date as date, a.location as location,
               a.casualty_level as casualty_level
        ORDER BY a.date DESC
        """
        return self.kb.execute_query(query, {"type": accident_type})
    
    def get_cases_by_cause(self, cause_name: str) -> List[Dict]:
        """根据致因获取相关案例"""
        query = """
        MATCH (f:CauseFactor {name: $name})<-[:CAUSED_BY]-(a:Accident)
        RETURN a.id as id, a.name as name, a.date as date, a.accident_type as type
        """
        return self.kb.execute_query(query, {"name": cause_name})


class StandardLibrary:
    """标准库管理类"""
    
    def __init__(self, kb: Neo4jKnowledgeBase):
        self.kb = kb
    
    def add_standard(self, standard_data: Dict) -> None:
        """
        添加法规标准
        
        参数:
            standard_data: 标准数据，包含:
                - id: 标准编号（如GB-xxxxx）
                - name: 标准名称
                - full_name: 全称
                - type: 类型（国家标准GB/行业标准AQ/规程/细则）
                - issuer: 发布单位
                - issue_date: 发布日期
                - status: 状态（现行/废止/修订）
                - content: 全文内容（可选，大文本）
        """
        query = """
        CREATE (s:Standard {
            id: $id,
            name: $name,
            full_name: $full_name,
            type: $type,
            issuer: $issuer,
            issue_date: date($issue_date),
            status: $status,
            created_at: datetime(),
            version: '1.0'
        })
        """
        self.kb.execute_write(query, standard_data)
    
    def add_clause(self, standard_id: str, clause_data: Dict) -> None:
        """
        添加条款
        
        参数:
            standard_id: 所属标准编号
            clause_data: 条款数据，包含:
                - number: 条款编号（如"第169条"）
                - title: 条款标题
                - content: 条款内容
                - keywords: 关键词列表
                - applicable_scope: 适用范围
        """
        query = """
        MATCH (s:Standard {id: $standard_id})
        CREATE (c:Clause {
            number: $number,
            title: $title,
            content: $content,
            keywords: $keywords,
            applicable_scope: $applicable_scope,
            created_at: datetime()
        })
        MERGE (c)-[:BELONGS_TO]->(s)
        """
        params = {"standard_id": standard_id, **clause_data}
        self.kb.execute_write(query, params)
    
    def link_clause_to_indicator(self, clause_number: str, indicator_id: str) -> None:
        """
        关联条款与指标
        
        参数:
            clause_number: 条款编号
            indicator_id: 指标编号
        """
        query = """
        MATCH (c:Clause {number: $clause_number})
        MATCH (i:Indicator {id: $indicator_id})
        MERGE (c)-[:APPLIES_TO]->(i)
        """
        self.kb.execute_write(query, {
            "clause_number": clause_number,
            "indicator_id": indicator_id
        })
    
    def search_standards_by_keyword(self, keyword: str) -> List[Dict]:
        """
        根据关键词搜索标准条款
        
        参数:
            keyword: 搜索关键词
        
        返回:
            匹配的标准和条款列表
        """
        query = """
        MATCH (c:Clause)
        WHERE c.content CONTAINS $keyword OR $keyword IN c.keywords
        MATCH (c)-[:BELONGS_TO]->(s:Standard)
        RETURN s.id as standard_id, s.name as standard_name, s.type as standard_type,
               c.number as clause_number, c.title as clause_title, c.content as clause_content
        """
        return self.kb.execute_query(query, {"keyword": keyword})
    
    def get_standards_for_indicator(self, indicator_id: str) -> List[Dict]:
        """
        获取指标相关的法规条款
        
        参数:
            indicator_id: 指标编号
        
        返回:
            相关标准和条款列表
        """
        query = """
        MATCH (i:Indicator {id: $id})
        OPTIONAL MATCH (i)-[:BASED_ON]->(c:Clause)-[:BELONGS_TO]->(s:Standard)
        OPTIONAL MATCH (i)-[:REFERENCES]->(s2:Standard)
        RETURN collect(DISTINCT {standard: s.name, clause: c.number, content: c.content}) as based_on_clauses,
               collect(DISTINCT s2.name) as referenced_standards
        """
        return self.kb.execute_query(query, {"id": indicator_id})
    
    def get_all_standards(self) -> List[Dict]:
        """获取所有法规标准"""
        query = """
        MATCH (s:Standard)
        RETURN s.id as id, s.name as name, s.type as type, s.status as status, s.issuer as issuer
        ORDER BY s.type, s.name
        """
        return self.kb.execute_query(query)
    
    def compliance_check(self, indicator_id: str, actual_value: Any) -> Dict:
        """
        合规性检查
        
        参数:
            indicator_id: 指标编号
            actual_value: 实测值
        
        返回:
            合规性判断结果和相关条款
        """
        # 获取指标阈值
        query1 = """
        MATCH (i:Indicator {id: $id})-[:HAS_THRESHOLD]->(t:Threshold)
        RETURN t.value as value, t.condition as condition, t.action as action
        """
        thresholds = self.kb.execute_query(query1, {"id": indicator_id})
        
        # 获取相关法规
        query2 = """
        MATCH (i:Indicator {id: $id})-[:BASED_ON]->(c:Clause)-[:BELONGS_TO]->(s:Standard)
        RETURN s.name as standard, c.number as clause, c.content as content
        """
        standards = self.kb.execute_query(query2, {"id": indicator_id})
        
        return {
            "indicator_id": indicator_id,
            "actual_value": actual_value,
            "thresholds": thresholds,
            "relevant_standards": standards,
            "is_compliant": True  # 需根据阈值判断
        }
    
    def update_standard_version(self, standard_id: str, new_status: str, new_version: str) -> None:
        """
        更新标准版本状态
        
        参数:
            standard_id: 标准编号
            new_status: 新状态
            new_version: 新版本号
        """
        query = """
        MATCH (s:Standard {id: $id})
        SET s.status = $status, s.version = $version, s.updated_at = datetime()
        """
        self.kb.execute_write(query, {
            "id": standard_id,
            "status": new_status,
            "version": new_version
        })


class HazardManagement:
    """隐患管理类"""
    
    def __init__(self, kb: Neo4jKnowledgeBase):
        self.kb = kb
    
    def add_hazard(self, hazard_data: Dict) -> None:
        """
        添加隐患记录
        
        参数:
            hazard_data: 隐患数据，包含:
                - id: 隐患编号
                - location: 隐患点
                - related_indicators: 关联危险源列表
                - cause_analysis: 原因分析
                - risk_level: 风险等级
                - responsible_person: 主要负责人
                - related_team: 关联班组
                - rectification_measure: 整改措施
                - deadline: 期限
                - status: 销号状态
        """
        query = """
        CREATE (h:Hazard {
            id: $id,
            location: $location,
            cause_analysis: $cause_analysis,
            risk_level: $risk_level,
            responsible_person: $responsible_person,
            related_team: $related_team,
            rectification_measure: $rectification_measure,
            deadline: date($deadline),
            status: $status,
            created_at: datetime()
        })
        """
        self.kb.execute_write(query, hazard_data)
        
        # 关联危险源
        for ind_id in hazard_data.get("related_indicators", []):
            self.kb.execute_write(
                "MATCH (h:Hazard {id: $hazard_id}) "
                "MATCH (i:Indicator {id: $indicator_id}) "
                "MERGE (h)-[:RELATED_TO]->(i)",
                {"hazard_id": hazard_data["id"], "indicator_id": ind_id}
            )
    
    def update_hazard_status(self, hazard_id: str, status: str, 
                            feedback: str = None, verifier: str = None) -> None:
        """
        更新隐患状态（八步闭环）
        
        参数:
            hazard_id: 隐患编号
            status: 新状态
            feedback: 反馈证据
            verifier: 验收人
        """
        query = """
        MATCH (h:Hazard {id: $id})
        SET h.status = $status
        SET h.feedback = CASE WHEN $feedback IS NOT NULL THEN $feedback ELSE h.feedback END
        SET h.verifier = CASE WHEN $verifier IS NOT NULL THEN $verifier ELSE h.verifier END
        SET h.updated_at = datetime()
        """
        self.kb.execute_write(query, {
            "id": hazard_id,
            "status": status,
            "feedback": feedback,
            "verifier": verifier
        })
    
    def get_hazards_by_status(self, status: str) -> List[Dict]:
        """根据状态获取隐患列表"""
        query = """
        MATCH (h:Hazard {status: $status})
        OPTIONAL MATCH (h)-[:RELATED_TO]->(i:Indicator)
        RETURN h.id as id, h.location as location, h.risk_level as risk_level,
               h.responsible_person as responsible_person, h.deadline as deadline,
               collect(i.name) as related_indicators
        ORDER BY h.created_at DESC
        """
        return self.kb.execute_query(query, {"status": status})
    
    def get_hazard_workflow(self, hazard_id: str) -> Dict:
        """获取隐患完整闭环流程"""
        query = """
        MATCH (h:Hazard {id: $id})
        OPTIONAL MATCH (h)-[:RELATED_TO]->(i:Indicator)
        OPTIONAL MATCH (h)-[:ASSIGNED_TO]->(p:Person)
        RETURN h, collect(i.name) as indicators
        """
        result = self.kb.execute_query(query, {"id": hazard_id})
        return result[0] if result else None


# 预定义的法规标准列表
STANDARD_LIST = [
    {"id": "GB-T-50417-2019", "name": "煤矿瓦斯治理工程设计规范", "type": "国家标准GB", "issuer": "国家标准化管理委员会", "status": "现行"},
    {"id": "AQ-1029-2007", "name": "煤矿安全监控系统通用技术要求", "type": "行业标准AQ", "issuer": "国家安监总局", "status": "现行"},
    {"id": "AQ-1026-2006", "name": "煤矿瓦斯抽采基本指标", "type": "行业标准AQ", "issuer": "国家安监总局", "status": "现行"},
    {"id": "REG-001", "name": "煤矿安全规程", "type": "规程", "issuer": "国家煤矿安全监察局", "status": "现行"},
    {"id": "REG-002", "name": "防治煤与瓦斯突出细则", "type": "细则", "issuer": "国家煤矿安全监察局", "status": "现行"},
    {"id": "REG-003", "name": "煤矿瓦斯抽采达标暂行规定", "type": "规定", "issuer": "国家安监总局", "status": "现行"},
    {"id": "REG-004", "name": "煤矿防灭火细则", "type": "细则", "issuer": "国家煤矿安全监察局", "status": "现行"},
    {"id": "REG-005", "name": "煤矿井下粉尘综合防治技术规范", "type": "规范", "issuer": "国家安监总局", "status": "现行"},
    {"id": "REG-006", "name": "安全生产标准化管理体系", "type": "管理体系", "issuer": "国家煤矿安全监察局", "status": "现行"},
    {"id": "REG-007", "name": "采掘工作面遇断层等构造带安全防治规定", "type": "规定", "issuer": "国家煤矿安全监察局", "status": "现行"},
    {"id": "REG-008", "name": "企业安全生产费用提取和使用管理办法", "type": "管理办法", "issuer": "财政部/安监总局", "status": "现行"},
    {"id": "REG-009", "name": "煤矿安全监控系统及检测仪器使用管理规范", "type": "规范", "issuer": "国家安监总局", "status": "现行"},
]


if __name__ == "__main__":
    # 测试连接
    print("煤矿瓦斯灾害知识库系统")
    print("=" * 60)
    
    try:
        kb = Neo4jKnowledgeBase(
            uri="bolt://localhost:7687",
            user="neo4j",
            password="your_password"  # 请修改为实际密码
        )
        
        # 初始化Schema
        kb.init_schema()
        
        # 初始化各库
        risk_lib = RiskRuleLibrary(kb)
        case_lib = CaseLibrary(kb)
        std_lib = StandardLibrary(kb)
        hazard_mgr = HazardManagement(kb)
        
        print("\n知识库模块已初始化：")
        print("  - RiskRuleLibrary: 风险规则库")
        print("  - CaseLibrary: 案例库")
        print("  - StandardLibrary: 标准库")
        print("  - HazardManagement: 隐患管理")
        
        kb.close()
        print("\n测试完成，数据库连接已关闭")
        
    except Exception as e:
        print(f"连接失败: {e}")
        print("请确保Neo4j服务已启动，并修改连接密码")