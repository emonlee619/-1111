"""
PostgreSQL静态数据存储系统

功能：
1. 存储煤矿静态数据（煤层瓦斯压力、地质构造等）
2. 存储模糊评价结果
3. 支持历史数据查询和趋势分析
4. 与Neo4j知识库联动，提供合规性判断

数据库表结构：
- static_data: 静态指标数据表
- fuzzy_evaluation: 模糊评价结果表
- risk_records: 风险记录表
"""

import os
from dotenv import load_dotenv

load_dotenv()

import psycopg2
from psycopg2.extras import execute_values
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import json
import uuid


class PostgreSQLManager:
    """PostgreSQL数据库管理类"""
    
    def __init__(self, host: str = None, port: int = None,
                 database: str = None, 
                 user: str = None, 
                 password: str = None):
        """
        初始化PostgreSQL连接
        
        参数:
            host: 数据库主机地址（默认从环境变量读取）
            port: 端口号（默认从环境变量读取）
            database: 数据库名称（默认从环境变量读取）
            user: 用户名（默认从环境变量读取）
            password: 密码（默认从环境变量读取）
        """
        host = host or os.getenv("POSTGRES_HOST", "localhost")
        port = port or int(os.getenv("POSTGRES_PORT", "5432"))
        database = database or os.getenv("POSTGRES_DB", "coalgas_warning")
        user = user or os.getenv("POSTGRES_USER", "postgres")
        password = password or os.getenv("POSTGRES_PASSWORD", "postgres")
        
        self.connection_params = {
            "host": host,
            "port": port,
            "database": database,
            "user": user,
            "password": password
        }
        self.conn = None
    
    def connect(self):
        """建立数据库连接"""
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(**self.connection_params)
        return self.conn
    
    def close(self):
        """关闭数据库连接"""
        if self.conn and not self.conn.closed:
            self.conn.close()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """
        执行查询
        
        参数:
            query: SQL查询语句
            params: 参数
        
        返回:
            查询结果列表
        """
        self.connect()
        with self.conn.cursor() as cursor:
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            return results
    
    def execute_insert(self, query: str, params: tuple = None) -> int:
        """
        执行插入
        
        参数:
            query: SQL插入语句
            params: 参数
        
        返回:
            插入记录ID
        """
        self.connect()
        with self.conn.cursor() as cursor:
            cursor.execute(query, params)
            self.conn.commit()
            return cursor.fetchone()[0] if cursor.fetchone() else None
    
    def execute_batch_insert(self, query: str, data_list: List[tuple]) -> int:
        """
        执行批量插入
        
        参数:
            query: SQL插入语句
            data_list: 数据列表
        
        返回:
            插入记录数
        """
        self.connect()
        with self.conn.cursor() as cursor:
            execute_values(cursor, query, data_list)
            self.conn.commit()
            return len(data_list)
    
    def create_tables(self):
        """
        创建数据库表结构
        
        表结构：
        1. static_data - 静态指标数据表
        2. fuzzy_evaluation - 模糊评价结果表
        3. risk_records - 风险记录表
        4. evaluation_history - 评价历史表
        """
        self.connect()
        
        # 静态数据表
        create_static_data = """
        CREATE TABLE IF NOT EXISTS static_data (
            id SERIAL PRIMARY KEY,
            mine_id VARCHAR(50) NOT NULL,
            mine_name VARCHAR(200),
            data_time TIMESTAMP NOT NULL,
            
            -- 地质参数
            coal_gas_pressure FLOAT,              -- 煤层瓦斯压力 (MPa)
            coal_firmness FLOAT,                   -- 煤坚固性系数
            gas_diffusion_velocity FLOAT,          -- 瓦斯放散初速度 (mmHg)
            burial_depth FLOAT,                    -- 煤层埋藏深度 (m)
            geological_structure INT,              -- 地质构造 (0-3)
            fault_distance FLOAT,                  -- 断层距工作面距离 (m)
            structure_distance FLOAT,              -- 工作面与构造带距离 (m)
            
            -- 突出危险性指标
            danger_indicator_d FLOAT,              -- D指标
            danger_indicator_k FLOAT,              -- K指标
            
            -- 煤层参数
            coal_thickness FLOAT,                  -- 煤层厚度 (m)
            dip_angle FLOAT,                       -- 煤层倾角 (度)
            spontaneous_combustion INT,            -- 自燃倾向性 (0-2)
            
            -- 通风抽采参数
            ventilation_system_type INT,           -- 主通风系统合理性 (0-3)
            gas_extraction_qualified BOOLEAN,      -- 瓦斯抽采效果检验达标
            gas_extraction_continuity BOOLEAN,     -- 瓦斯抽采效果接续合理
            
            -- 管理参数
            wind_speed_alarm_count INT,            -- 风速异常报警次数
            fan_feeder_abnormal_count INT,         -- 局部通风机馈电异常次数
            power_cutoff_failure_count INT,        -- 甲烷电风电闭锁失效次数
            gas_sensor_overrun_duration FLOAT,     -- 瓦斯传感器超限时长 (min)
            gas_sensor_overrun_count INT,          -- 瓦斯传感器超限次数
            power_cutoff_miss_count INT,           -- 应断未断电次数
            gas_inspector_violation_count INT,     -- 瓦检员空班漏检假检次数
            ventilation_violation_count INT,       -- 通风专业瓦斯相关三违数量
            
            -- 人员管理参数
            training_rate FLOAT,                   -- 安全培训率
            certificate_rate FLOAT,                -- 持证上岗率
            safety_cost_per_ton FLOAT,             -- 吨煤安全费用提取
            gas_level INT,                         -- 矿井瓦斯等级 (0-3)
            
            -- 其他参数
            ignition_management BOOLEAN,           -- 火源管理合规
            fire_prevention_design BOOLEAN,        -- 有防灭火设计
            support_material_flammable BOOLEAN,    -- 支护材料可燃
            dust_explosion_index FLOAT,            -- 煤尘爆炸指数
            gas_explosion_hazard_count INT,        -- 瓦斯爆炸类隐患数量
            
            -- 历史参数
            accident_history BOOLEAN,              -- 事故历史
            accident_severity INT,                 -- 事故严重程度
            
            -- 综合防治措施评分
            prevention_measure_scores JSONB,       -- 综合防治措施各项评分
            
            -- 元数据
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_source VARCHAR(100),
            verified BOOLEAN DEFAULT FALSE,
            notes TEXT
        );
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_static_data_mine_id ON static_data(mine_id);
        CREATE INDEX IF NOT EXISTS idx_static_data_time ON static_data(data_time);
        CREATE INDEX IF NOT EXISTS idx_static_data_danger_d ON static_data(danger_indicator_d);
        CREATE INDEX IF NOT EXISTS idx_static_data_danger_k ON static_data(danger_indicator_k);
        """
        
        # 模糊评价结果表
        create_fuzzy_evaluation = """
        CREATE TABLE IF NOT EXISTS fuzzy_evaluation (
            id SERIAL PRIMARY KEY,
            static_data_id INT REFERENCES static_data(id),
            mine_id VARCHAR(50) NOT NULL,
            evaluation_time TIMESTAMP NOT NULL,
            
            -- 评价结果
            composite_score FLOAT,                 -- 综合评分 (0-100)
            risk_level VARCHAR(50),                -- 风险等级
            red_line_triggered BOOLEAN,            -- 红线熔断
            red_line_reason TEXT,                  -- 红线原因
            
            -- 模糊评价向量
            fuzzy_vector_b JSONB,                  -- 模糊向量 B = [V1, V2, V3, V4, V5]
            max_membership_level VARCHAR(50),      -- 最大隶属度等级
            max_membership_value FLOAT,            -- 最大隶属度值
            
            -- 详细数据
            indicator_scores JSONB,                -- 各项评分
            indicator_membership JSONB,            -- 各项隶属度
            weight_vector JSONB,                   -- 权重向量
            
            -- 静态风险指数
            static_risk_index_s FLOAT,             -- 静态本底风险指数 S
            
            -- 元数据
            evaluation_method VARCHAR(50),         -- 评价方法
            evaluator VARCHAR(100),                -- 评价人
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_static_data FOREIGN KEY (static_data_id) REFERENCES static_data(id)
        );
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_fuzzy_eval_mine_id ON fuzzy_evaluation(mine_id);
        CREATE INDEX IF NOT EXISTS idx_fuzzy_eval_time ON fuzzy_evaluation(evaluation_time);
        CREATE INDEX IF NOT EXISTS idx_fuzzy_eval_risk_level ON fuzzy_evaluation(risk_level);
        CREATE INDEX IF NOT EXISTS idx_fuzzy_eval_red_line ON fuzzy_evaluation(red_line_triggered);
        """
        
        # 风险记录表
        create_risk_records = """
        CREATE TABLE IF NOT EXISTS risk_records (
            id SERIAL PRIMARY KEY,
            mine_id VARCHAR(50) NOT NULL,
            record_time TIMESTAMP NOT NULL,
            
            -- 风险信息
            risk_type VARCHAR(50),                 -- 风险类型
            risk_level VARCHAR(50),                -- 风险等级
            risk_score FLOAT,                      -- 风险评分
            
            -- 风险来源
            source_type VARCHAR(50),               -- 来源类型 (静态/动态/综合)
            static_evaluation_id INT REFERENCES fuzzy_evaluation(id),
            dynamic_warning_id VARCHAR(50),        -- 动态预警ID
            
            -- 处理状态
            status VARCHAR(50),                    -- 处理状态
            handled_by VARCHAR(100),               -- 处理人
            handle_time TIMESTAMP,                 -- 处理时间
            handle_result TEXT,                    -- 处理结果
            
            -- 关联措施
            measures_taken JSONB,                  -- 采取的措施
            
            -- 元数据
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_risk_records_mine_id ON risk_records(mine_id);
        CREATE INDEX IF NOT EXISTS idx_risk_records_time ON risk_records(record_time);
        CREATE INDEX IF NOT EXISTS idx_risk_records_level ON risk_records(risk_level);
        CREATE INDEX IF NOT EXISTS idx_risk_records_status ON risk_records(status);
        """
        
        # 评价历史表（用于趋势分析）
        create_evaluation_history = """
        CREATE TABLE IF NOT EXISTS evaluation_history (
            id SERIAL PRIMARY KEY,
            mine_id VARCHAR(50) NOT NULL,
            evaluation_date DATE NOT NULL,
            
            -- 统计数据
            avg_composite_score FLOAT,             -- 平均综合评分
            max_composite_score FLOAT,             -- 最高综合评分
            min_composite_score FLOAT,             -- 最低综合评分
            evaluation_count INT,                  -- 评价次数
            
            -- 风险分布
            safe_count INT,                        -- 安全次数
            fairly_safe_count INT,                 -- 较安全次数
            general_count INT,                     -- 一般次数
            fairly_dangerous_count INT,            -- 较危险次数
            dangerous_count INT,                   -- 危险次数
            red_line_count INT,                    -- 红线触发次数
            
            -- 关键指标趋势
            avg_gas_pressure FLOAT,                -- 平均瓦斯压力
            avg_d_indicator FLOAT,                 -- 平均D指标
            avg_k_indicator FLOAT,                 -- 平均K指标
            
            -- 元数据
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT unique_mine_date UNIQUE (mine_id, evaluation_date)
        );
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_eval_history_mine_id ON evaluation_history(mine_id);
        CREATE INDEX IF NOT EXISTS idx_eval_history_date ON evaluation_history(evaluation_date);
        """
        
        with self.conn.cursor() as cursor:
            cursor.execute(create_static_data)
            cursor.execute(create_fuzzy_evaluation)
            cursor.execute(create_risk_records)
            cursor.execute(create_evaluation_history)
            self.conn.commit()
        
        print("数据库表结构创建完成")
    
    def drop_tables(self):
        """删除所有表（谨慎使用）"""
        self.connect()
        with self.conn.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS evaluation_history CASCADE")
            cursor.execute("DROP TABLE IF EXISTS risk_records CASCADE")
            cursor.execute("DROP TABLE IF EXISTS fuzzy_evaluation CASCADE")
            cursor.execute("DROP TABLE IF EXISTS static_data CASCADE")
            self.conn.commit()
        print("数据库表已删除")


class StaticDataManager:
    """静态数据管理类"""
    
    def __init__(self, pg_manager: PostgreSQLManager):
        self.pg = pg_manager
    
    def insert_static_data(self, data: Dict) -> int:
        """
        插入静态数据
        
        参数:
            data: 静态数据字典
        
        返回:
            记录ID
        """
        query = """
        INSERT INTO static_data (
            mine_id, mine_name, data_time,
            coal_gas_pressure, coal_firmness, gas_diffusion_velocity,
            burial_depth, geological_structure, fault_distance, structure_distance,
            danger_indicator_d, danger_indicator_k,
            coal_thickness, dip_angle, spontaneous_combustion,
            ventilation_system_type, gas_extraction_qualified, gas_extraction_continuity,
            wind_speed_alarm_count, fan_feeder_abnormal_count, power_cutoff_failure_count,
            gas_sensor_overrun_duration, gas_sensor_overrun_count, power_cutoff_miss_count,
            gas_inspector_violation_count, ventilation_violation_count,
            training_rate, certificate_rate, safety_cost_per_ton, gas_level,
            ignition_management, fire_prevention_design, support_material_flammable,
            dust_explosion_index, gas_explosion_hazard_count,
            accident_history, accident_severity,
            prevention_measure_scores, data_source, verified, notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
        """
        
        params = (
            data.get("mine_id"),
            data.get("mine_name"),
            data.get("data_time", datetime.now()),
            data.get("coal_gas_pressure"),
            data.get("coal_firmness"),
            data.get("gas_diffusion_velocity"),
            data.get("burial_depth"),
            data.get("geological_structure"),
            data.get("fault_distance"),
            data.get("structure_distance"),
            data.get("danger_indicator_d"),
            data.get("danger_indicator_k"),
            data.get("coal_thickness"),
            data.get("dip_angle"),
            data.get("spontaneous_combustion"),
            data.get("ventilation_system_type"),
            data.get("gas_extraction_qualified"),
            data.get("gas_extraction_continuity"),
            data.get("wind_speed_alarm_count"),
            data.get("fan_feeder_abnormal_count"),
            data.get("power_cutoff_failure_count"),
            data.get("gas_sensor_overrun_duration"),
            data.get("gas_sensor_overrun_count"),
            data.get("power_cutoff_miss_count"),
            data.get("gas_inspector_violation_count"),
            data.get("ventilation_violation_count"),
            data.get("training_rate"),
            data.get("certificate_rate"),
            data.get("safety_cost_per_ton"),
            data.get("gas_level"),
            data.get("ignition_management"),
            data.get("fire_prevention_design"),
            data.get("support_material_flammable"),
            data.get("dust_explosion_index"),
            data.get("gas_explosion_hazard_count"),
            data.get("accident_history"),
            data.get("accident_severity"),
            json.dumps(data.get("prevention_measure_scores", {}), ensure_ascii=False),
            data.get("data_source", "手动录入"),
            data.get("verified", False),
            data.get("notes", "")
        )
        
        return self.pg.execute_insert(query, params)
    
    def batch_insert_static_data(self, data_list: List[Dict]) -> int:
        """
        批量插入静态数据
        
        参数:
            data_list: 数据列表
        
        返回:
            插入记录数
        """
        rows = []
        for data in data_list:
            rows.append((
                data.get("mine_id"),
                data.get("mine_name"),
                data.get("data_time", datetime.now()),
                data.get("coal_gas_pressure"),
                data.get("coal_firmness"),
                data.get("gas_diffusion_velocity"),
                data.get("burial_depth"),
                data.get("geological_structure"),
                data.get("fault_distance"),
                data.get("structure_distance"),
                data.get("danger_indicator_d"),
                data.get("danger_indicator_k"),
                data.get("coal_thickness"),
                data.get("dip_angle"),
                data.get("spontaneous_combustion"),
                data.get("ventilation_system_type"),
                data.get("gas_extraction_qualified"),
                data.get("gas_extraction_continuity"),
                data.get("wind_speed_alarm_count"),
                data.get("fan_feeder_abnormal_count"),
                data.get("power_cutoff_failure_count"),
                data.get("gas_sensor_overrun_duration"),
                data.get("gas_sensor_overrun_count"),
                data.get("power_cutoff_miss_count"),
                data.get("gas_inspector_violation_count"),
                data.get("ventilation_violation_count"),
                data.get("training_rate"),
                data.get("certificate_rate"),
                data.get("safety_cost_per_ton"),
                data.get("gas_level"),
                data.get("ignition_management"),
                data.get("fire_prevention_design"),
                data.get("support_material_flammable"),
                data.get("dust_explosion_index"),
                data.get("gas_explosion_hazard_count"),
                data.get("accident_history"),
                data.get("accident_severity"),
                json.dumps(data.get("prevention_measure_scores", {}), ensure_ascii=False),
                data.get("data_source", "批量导入"),
                data.get("verified", False),
                data.get("notes", "")
            ))
        
        query = """
        INSERT INTO static_data (
            mine_id, mine_name, data_time,
            coal_gas_pressure, coal_firmness, gas_diffusion_velocity,
            burial_depth, geological_structure, fault_distance, structure_distance,
            danger_indicator_d, danger_indicator_k,
            coal_thickness, dip_angle, spontaneous_combustion,
            ventilation_system_type, gas_extraction_qualified, gas_extraction_continuity,
            wind_speed_alarm_count, fan_feeder_abnormal_count, power_cutoff_failure_count,
            gas_sensor_overrun_duration, gas_sensor_overrun_count, power_cutoff_miss_count,
            gas_inspector_violation_count, ventilation_violation_count,
            training_rate, certificate_rate, safety_cost_per_ton, gas_level,
            ignition_management, fire_prevention_design, support_material_flammable,
            dust_explosion_index, gas_explosion_hazard_count,
            accident_history, accident_severity,
            prevention_measure_scores, data_source, verified, notes
        ) VALUES %s
        """
        
        return self.pg.execute_batch_insert(query, rows)
    
    def get_static_data_by_mine(self, mine_id: str, limit: int = 10) -> List[Dict]:
        """
        获取指定矿井的静态数据
        
        参数:
            mine_id: 矿井ID
            limit: 返回数量
        
        返回:
            数据列表
        """
        query = """
        SELECT * FROM static_data
        WHERE mine_id = %s
        ORDER BY data_time DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (mine_id, limit))
    
    def get_latest_static_data(self, mine_id: str) -> Optional[Dict]:
        """
        获取最新静态数据
        
        参数:
            mine_id: 矿井ID
        
        返回:
            最新数据
        """
        query = """
        SELECT * FROM static_data
        WHERE mine_id = %s
        ORDER BY data_time DESC
        LIMIT 1
        """
        results = self.pg.execute_query(query, (mine_id,))
        return results[0] if results else None
    
    def get_static_data_in_range(self, mine_id: str, 
                                  start_time: datetime, 
                                  end_time: datetime) -> List[Dict]:
        """
        获取时间范围内的静态数据
        
        参数:
            mine_id: 矿井ID
            start_time: 开始时间
            end_time: 结束时间
        
        返回:
            数据列表
        """
        query = """
        SELECT * FROM static_data
        WHERE mine_id = %s AND data_time BETWEEN %s AND %s
        ORDER BY data_time
        """
        return self.pg.execute_query(query, (mine_id, start_time, end_time))
    
    def get_red_line_data(self, limit: int = 50) -> List[Dict]:
        """
        获取触发红线的数据
        
        参数:
            limit: 返回数量
        
        返回:
            触发红线的数据列表
        """
        query = """
        SELECT * FROM static_data
        WHERE danger_indicator_d >= 0.25 OR danger_indicator_k >= 20
        ORDER BY data_time DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (limit,))
    
    def get_high_risk_mines(self, threshold_d: float = 0.25, 
                            threshold_k: float = 20) -> List[Dict]:
        """
        获取高危矿井列表
        
        参数:
            threshold_d: D指标阈值
            threshold_k: K指标阈值
        
        返回:
            高危矿井列表
        """
        query = """
        SELECT DISTINCT mine_id, mine_name,
               MAX(danger_indicator_d) as max_d,
               MAX(danger_indicator_k) as max_k,
               MAX(data_time) as latest_time
        FROM static_data
        WHERE danger_indicator_d >= %s OR danger_indicator_k >= %s
        GROUP BY mine_id, mine_name
        ORDER BY max_d DESC, max_k DESC
        """
        return self.pg.execute_query(query, (threshold_d, threshold_k))


class FuzzyEvaluationManager:
    """模糊评价结果管理类"""
    
    def __init__(self, pg_manager: PostgreSQLManager):
        self.pg = pg_manager
    
    def save_evaluation_result(self, static_data_id: int, mine_id: str,
                               evaluation_result: Dict) -> int:
        """
        保存评价结果
        
        参数:
            static_data_id: 静态数据ID
            mine_id: 矿井ID
            evaluation_result: 评价结果字典
        
        返回:
            记录ID
        """
        query = """
        INSERT INTO fuzzy_evaluation (
            static_data_id, mine_id, evaluation_time,
            composite_score, risk_level, red_line_triggered, red_line_reason,
            fuzzy_vector_b, max_membership_level, max_membership_value,
            indicator_scores, indicator_membership, weight_vector,
            static_risk_index_s, evaluation_method, evaluator
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
        """
        
        params = (
            static_data_id,
            mine_id,
            datetime.now(),
            evaluation_result.get("综合评分"),
            evaluation_result.get("风险等级"),
            evaluation_result.get("红线触发"),
            evaluation_result.get("红线原因"),
            json.dumps(evaluation_result.get("模糊向量B", []), ensure_ascii=False),
            evaluation_result.get("最大隶属度等级"),
            evaluation_result.get("最大隶属度值"),
            json.dumps(evaluation_result.get("各项评分", {}), ensure_ascii=False),
            json.dumps(evaluation_result.get("各项隶属度", {}), ensure_ascii=False),
            json.dumps(evaluation_result.get("权重向量A", []), ensure_ascii=False),
            evaluation_result.get("综合评分"),  # 静态风险指数 S = 综合评分
            "模糊综合评价",
            "系统自动"
        )
        
        return self.pg.execute_insert(query, params)
    
    def get_evaluation_history(self, mine_id: str, limit: int = 10) -> List[Dict]:
        """
        获取评价历史
        
        参数:
            mine_id: 矿井ID
            limit: 返回数量
        
        返回:
            评价历史列表
        """
        query = """
        SELECT e.*, s.mine_name
        FROM fuzzy_evaluation e
        LEFT JOIN static_data s ON e.static_data_id = s.id
        WHERE e.mine_id = %s
        ORDER BY e.evaluation_time DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (mine_id, limit))
    
    def get_latest_evaluation(self, mine_id: str) -> Optional[Dict]:
        """
        获取最新评价结果
        
        参数:
            mine_id: 矿井ID
        
        返回:
            最新评价结果
        """
        query = """
        SELECT e.*, s.danger_indicator_d, s.danger_indicator_k
        FROM fuzzy_evaluation e
        LEFT JOIN static_data s ON e.static_data_id = s.id
        WHERE e.mine_id = %s
        ORDER BY e.evaluation_time DESC
        LIMIT 1
        """
        results = self.pg.execute_query(query, (mine_id,))
        return results[0] if results else None
    
    def get_red_line_evaluations(self, limit: int = 50) -> List[Dict]:
        """
        获取触发红线的评价记录
        
        参数:
            limit: 返回数量
        
        返回:
            触发红线的评价列表
        """
        query = """
        SELECT e.*, s.mine_name
        FROM fuzzy_evaluation e
        LEFT JOIN static_data s ON e.static_data_id = s.id
        WHERE e.red_line_triggered = TRUE
        ORDER BY e.evaluation_time DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (limit,))
    
    def get_risk_statistics(self, start_date: datetime = None, 
                            end_date: datetime = None) -> Dict:
        """
        获取风险统计
        
        参数:
            start_date: 开始日期
            end_date: 结束日期
        
        返回:
            统计数据
        """
        where_clause = ""
        params = []
        
        if start_date and end_date:
            where_clause = "WHERE evaluation_time BETWEEN %s AND %s"
            params = [start_date, end_date]
        
        query = f"""
        SELECT 
            COUNT(*) as total,
            AVG(composite_score) as avg_score,
            MAX(composite_score) as max_score,
            MIN(composite_score) as min_score,
            SUM(CASE WHEN risk_level LIKE '%安全%' THEN 1 ELSE 0 END) as safe_count,
            SUM(CASE WHEN risk_level LIKE '%较安全%' THEN 1 ELSE 0 END) as fairly_safe_count,
            SUM(CASE WHEN risk_level LIKE '%一般%' THEN 1 ELSE 0 END) as general_count,
            SUM(CASE WHEN risk_level LIKE '%较危险%' THEN 1 ELSE 0 END) as fairly_dangerous_count,
            SUM(CASE WHEN risk_level LIKE '%危险%' THEN 1 ELSE 0 END) as dangerous_count,
            SUM(CASE WHEN red_line_triggered = TRUE THEN 1 ELSE 0 END) as red_line_count
        FROM fuzzy_evaluation
        {where_clause}
        """
        
        result = self.pg.execute_query(query, tuple(params))
        return result[0] if result else {}
    
    def generate_evaluation_history_daily(self, mine_id: str = None) -> int:
        """
        生成每日评价历史汇总
        
        参数:
            mine_id: 矿井ID（可选，不指定则生成所有矿井）
        
        返回:
            生成的记录数
        """
        where_clause = "WHERE mine_id = %s" if mine_id else ""
        params = (mine_id,) if mine_id else ()
        
        query = f"""
        INSERT INTO evaluation_history (
            mine_id, evaluation_date,
            avg_composite_score, max_composite_score, min_composite_score, evaluation_count,
            safe_count, fairly_safe_count, general_count, fairly_dangerous_count, dangerous_count, red_line_count,
            avg_gas_pressure, avg_d_indicator, avg_k_indicator
        )
        SELECT 
            mine_id,
            DATE(evaluation_time) as evaluation_date,
            AVG(composite_score) as avg_composite_score,
            MAX(composite_score) as max_composite_score,
            MIN(composite_score) as min_composite_score,
            COUNT(*) as evaluation_count,
            SUM(CASE WHEN risk_level LIKE '%安全%' AND red_line_triggered = FALSE THEN 1 ELSE 0 END) as safe_count,
            SUM(CASE WHEN risk_level LIKE '%较安全%' AND red_line_triggered = FALSE THEN 1 ELSE 0 END) as fairly_safe_count,
            SUM(CASE WHEN risk_level LIKE '%一般%' AND red_line_triggered = FALSE THEN 1 ELSE 0 END) as general_count,
            SUM(CASE WHEN risk_level LIKE '%较危险%' AND red_line_triggered = FALSE THEN 1 ELSE 0 END) as fairly_dangerous_count,
            SUM(CASE WHEN (risk_level LIKE '%危险%' OR red_line_triggered = TRUE) THEN 1 ELSE 0 END) as dangerous_count,
            SUM(CASE WHEN red_line_triggered = TRUE THEN 1 ELSE 0 END) as red_line_count,
            AVG(s.coal_gas_pressure) as avg_gas_pressure,
            AVG(s.danger_indicator_d) as avg_d_indicator,
            AVG(s.danger_indicator_k) as avg_k_indicator
        FROM fuzzy_evaluation e
        LEFT JOIN static_data s ON e.static_data_id = s.id
        {where_clause}
        GROUP BY mine_id, DATE(evaluation_time)
        ON CONFLICT (mine_id, evaluation_date) DO UPDATE SET
            avg_composite_score = EXCLUDED.avg_composite_score,
            max_composite_score = EXCLUDED.max_composite_score,
            min_composite_score = EXCLUDED.min_composite_score,
            evaluation_count = EXCLUDED.evaluation_count,
            safe_count = EXCLUDED.safe_count,
            fairly_safe_count = EXCLUDED.fairly_safe_count,
            general_count = EXCLUDED.general_count,
            fairly_dangerous_count = EXCLUDED.fairly_dangerous_count,
            dangerous_count = EXCLUDED.dangerous_count,
            red_line_count = EXCLUDED.red_line_count,
            avg_gas_pressure = EXCLUDED.avg_gas_pressure,
            avg_d_indicator = EXCLUDED.avg_d_indicator,
            avg_k_indicator = EXCLUDED.avg_k_indicator
        """
        
        self.pg.connect()
        with self.pg.conn.cursor() as cursor:
            cursor.execute(query, params)
            self.pg.conn.commit()
            return cursor.rowcount
    
    def get_trend_analysis(self, mine_id: str, days: int = 30) -> List[Dict]:
        """
        获取趋势分析数据
        
        参数:
            mine_id: 矿井ID
            days: 天数
        
        返回:
            趋势数据列表
        """
        query = """
        SELECT * FROM evaluation_history
        WHERE mine_id = %s
        ORDER BY evaluation_date DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (mine_id, days))


class RiskRecordManager:
    """风险记录管理类"""
    
    def __init__(self, pg_manager: PostgreSQLManager):
        self.pg = pg_manager
    
    def create_risk_record(self, mine_id: str, risk_data: Dict) -> int:
        """
        创建风险记录
        
        参数:
            mine_id: 矿井ID
            risk_data: 风险数据
        
        返回:
            记录ID
        """
        query = """
        INSERT INTO risk_records (
            mine_id, record_time,
            risk_type, risk_level, risk_score,
            source_type, static_evaluation_id, dynamic_warning_id,
            status, handled_by, handle_time, handle_result,
            measures_taken
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
        """
        
        params = (
            mine_id,
            datetime.now(),
            risk_data.get("risk_type"),
            risk_data.get("risk_level"),
            risk_data.get("risk_score"),
            risk_data.get("source_type"),
            risk_data.get("static_evaluation_id"),
            risk_data.get("dynamic_warning_id"),
            risk_data.get("status", "未处理"),
            risk_data.get("handled_by"),
            risk_data.get("handle_time"),
            risk_data.get("handle_result"),
            json.dumps(risk_data.get("measures_taken", []), ensure_ascii=False)
        )
        
        return self.pg.execute_insert(query, params)
    
    def get_risk_records_by_mine(self, mine_id: str, 
                                  status: str = None,
                                  limit: int = 50) -> List[Dict]:
        """
        获取矿井风险记录
        
        参数:
            mine_id: 矿井ID
            status: 状态过滤
            limit: 返回数量
        
        返回:
            风险记录列表
        """
        where_clause = "WHERE mine_id = %s"
        params = [mine_id]
        
        if status:
            where_clause += " AND status = %s"
            params.append(status)
        
        query = f"""
        SELECT * FROM risk_records
        {where_clause}
        ORDER BY record_time DESC
        LIMIT %s
        """
        params.append(limit)
        
        return self.pg.execute_query(query, tuple(params))
    
    def update_risk_status(self, record_id: int, status: str,
                           handled_by: str = None,
                           handle_result: str = None) -> bool:
        """
        更新风险记录状态
        
        参数:
            record_id: 记录ID
            status: 新状态
            handled_by: 处理人
            handle_result: 处理结果
        
        返回:
            是否成功
        """
        query = """
        UPDATE risk_records
        SET status = %s,
            handled_by = COALESCE(%s, handled_by),
            handle_time = CASE WHEN %s IS NOT NULL THEN CURRENT_TIMESTAMP ELSE handle_time END,
            handle_result = COALESCE(%s, handle_result),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        
        self.pg.connect()
        with self.pg.conn.cursor() as cursor:
            cursor.execute(query, (status, handled_by, handled_by, handle_result, record_id))
            self.pg.conn.commit()
            return cursor.rowcount > 0
    
    def get_unhandled_risks(self, limit: int = 100) -> List[Dict]:
        """
        获取未处理的风险记录
        
        参数:
            limit: 返回数量
        
        返回:
            未处理风险列表
        """
        query = """
        SELECT r.*, s.mine_name
        FROM risk_records r
        LEFT JOIN static_data s ON r.mine_id = s.mine_id
        WHERE r.status = '未处理'
        ORDER BY r.risk_score DESC, r.record_time DESC
        LIMIT %s
        """
        return self.pg.execute_query(query, (limit,))


if __name__ == "__main__":
    # 测试PostgreSQL存储
    print("PostgreSQL静态数据存储系统测试")
    print("=" * 60)
    
    try:
        # 创建数据库管理器
        pg = PostgreSQLManager(
            host="localhost",
            port=5432,
            database="coalgas_warning",
            user="postgres",
            password="postgres"
        )
        
        # 创建表结构
        print("\n创建数据库表结构...")
        pg.create_tables()
        
        # 创建静态数据管理器
        sdm = StaticDataManager(pg)
        
        # 插入测试数据
        print("\n插入测试静态数据...")
        test_data = {
            "mine_id": "MINE_001",
            "mine_name": "测试煤矿",
            "data_time": datetime.now(),
            "coal_gas_pressure": 0.65,
            "coal_firmness": 0.85,
            "gas_diffusion_velocity": 8,
            "burial_depth": 350,
            "geological_structure": 0,
            "fault_distance": 250,
            "structure_distance": 220,
            "danger_indicator_d": 0.15,
            "danger_indicator_k": 15,
            "coal_thickness": 1.5,
            "dip_angle": 20,
            "spontaneous_combustion": 0,
            "ventilation_system_type": 0,
            "gas_extraction_qualified": True,
            "gas_extraction_continuity": True,
            "wind_speed_alarm_count": 0,
            "fan_feeder_abnormal_count": 0,
            "power_cutoff_failure_count": 0,
            "gas_sensor_overrun_duration": 0,
            "gas_sensor_overrun_count": 0,
            "power_cutoff_miss_count": 0,
            "gas_inspector_violation_count": 0,
            "ventilation_violation_count": 0,
            "training_rate": 1.0,
            "certificate_rate": 1.0,
            "safety_cost_per_ton": 35,
            "gas_level": 0,
            "ignition_management": True,
            "fire_prevention_design": True,
            "support_material_flammable": False,
            "dust_explosion_index": 8,
            "gas_explosion_hazard_count": 0,
            "accident_history": False,
            "accident_severity": 0,
            "prevention_measure_scores": {
                "通风系统合理性": 10,
                "测风制度执行": 15,
                "通风设施质量": 15
            },
            "verified": True,
            "notes": "测试数据"
        }
        
        static_data_id = sdm.insert_static_data(test_data)
        print(f"静态数据ID: {static_data_id}")
        
        # 创建模糊评价管理器
        fem = FuzzyEvaluationManager(pg)
        
        # 导入模糊评价模块并执行评价
        print("\n执行模糊评价...")
        from fuzzy_evaluation import fuzzy_comprehensive_evaluation
        
        # 转换数据格式
        eval_data = {
            "煤层瓦斯压力": test_data["coal_gas_pressure"],
            "煤坚固性系数": test_data["coal_firmness"],
            "瓦斯放散初速度": test_data["gas_diffusion_velocity"],
            "煤层埋藏深度": test_data["burial_depth"],
            "地质构造": test_data["geological_structure"],
            "断层距工作面距离": test_data["fault_distance"],
            "工作面与构造带距离": test_data["structure_distance"],
            "突出危险性综合指标D": test_data["danger_indicator_d"],
            "突出危险性综合指标K": test_data["danger_indicator_k"],
            "煤层厚度": test_data["coal_thickness"],
            "煤层倾角": test_data["dip_angle"],
            "煤层自燃倾向性": test_data["spontaneous_combustion"],
            "主通风系统合理性": test_data["ventilation_system_type"],
            "瓦斯抽采效果检验达标": test_data["gas_extraction_qualified"],
            "瓦斯抽采效果接续合理": test_data["gas_extraction_continuity"],
            "综合防治措施": test_data["prevention_measure_scores"],
            "风速异常报警次数": test_data["wind_speed_alarm_count"],
            "局部通风机馈电异常次数": test_data["fan_feeder_abnormal_count"],
            "甲烷电风电闭锁失效次数": test_data["power_cutoff_failure_count"],
            "瓦斯传感器超限时长": test_data["gas_sensor_overrun_duration"],
            "瓦斯传感器超限次数": test_data["gas_sensor_overrun_count"],
            "应断未断电次数": test_data["power_cutoff_miss_count"],
            "瓦检员空班漏检假检次数": test_data["gas_inspector_violation_count"],
            "通风专业瓦斯相关三违数量": test_data["ventilation_violation_count"],
            "安全培训率": test_data["training_rate"],
            "持证上岗率": test_data["certificate_rate"],
            "吨煤安全费用提取": test_data["safety_cost_per_ton"],
            "矿井瓦斯等级": test_data["gas_level"],
            "火源管理合规": test_data["ignition_management"],
            "有防灭火设计": test_data["fire_prevention_design"],
            "支护材料可燃": test_data["support_material_flammable"],
            "煤尘爆炸指数": test_data["dust_explosion_index"],
            "瓦斯爆炸类隐患数量": test_data["gas_explosion_hazard_count"],
            "事故历史": (test_data["accident_history"], test_data["accident_severity"])
        }
        
        result = fuzzy_comprehensive_evaluation(eval_data)
        print(f"综合评分: {result['综合评分']}")
        print(f"风险等级: {result['风险等级']}")
        
        # 保存评价结果
        print("\n保存评价结果...")
        eval_id = fem.save_evaluation_result(static_data_id, "MINE_001", result)
        print(f"评价结果ID: {eval_id}")
        
        # 查询数据
        print("\n查询静态数据...")
        data = sdm.get_latest_static_data("MINE_001")
        print(f"矿井: {data['mine_name']}")
        print(f"瓦斯压力: {data['coal_gas_pressure']} MPa")
        print(f"D指标: {data['danger_indicator_d']}")
        
        # 查询评价历史
        print("\n查询评价历史...")
        history = fem.get_evaluation_history("MINE_001", limit=5)
        for h in history:
            print(f"  {h['evaluation_time']}: {h['risk_level']} (评分:{h['composite_score']})")
        
        # 获取风险统计
        print("\n获取风险统计...")
        stats = fem.get_risk_statistics()
        print(f"总评价次数: {stats.get('total', 0)}")
        print(f"平均评分: {stats.get('avg_score', 0)}")
        
        pg.close()
        print("\n测试完成")
        
    except Exception as e:
        print(f"测试失败: {e}")
        print("请确保PostgreSQL服务已启动，数据库coalgas_warning已创建")