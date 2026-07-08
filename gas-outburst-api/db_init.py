import sqlite3
import os

DB_PATH = 'outburst_warning.db'

def init_database():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE dynamic_sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            sensor_id TEXT NOT NULL,
            sensor_type TEXT NOT NULL,
            value REAL NOT NULL,
            UNIQUE(timestamp, sensor_id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE static_mine_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mine_id TEXT UNIQUE NOT NULL,
            mine_type TEXT,
            gas_pressure_MPa REAL,
            coal_firmness_f REAL,
            gas_diffusion_velocity_mmHg REAL,
            burial_depth_m REAL,
            geological_structure TEXT,
            fault_distance_m REAL,
            structure_distance_m REAL,
            d_value REAL,
            k_value REAL,
            coal_thickness_m REAL,
            dip_angle_deg REAL,
            spontaneous_combustion TEXT,
            ventilation_system TEXT,
            gas_extraction_qualified INTEGER,
            gas_extraction_continuous INTEGER,
            prevention_score REAL,
            wind_speed_alarm_count INTEGER,
            fan_abnormal_count INTEGER,
            power_cutoff_fail_count INTEGER,
            sensor_overrun_duration_min REAL,
            sensor_overrun_count INTEGER,
            power_cutoff_miss_count INTEGER,
            inspector_violation_count INTEGER,
            ventilation_violation_count INTEGER,
            training_rate REAL,
            certificate_rate REAL,
            safety_cost_per_ton REAL,
            gas_level TEXT,
            ignition_management_compliant INTEGER,
            fire_prevention_design INTEGER,
            support_material_flammable INTEGER,
            dust_explosion_index REAL,
            gas_explosion_hazard_count INTEGER,
            has_accident_history INTEGER,
            accident_severity INTEGER,
            fuzzy_score REAL,
            risk_level TEXT,
            red_line_triggered INTEGER,
            static_risk_index REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE meta_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicator_name TEXT NOT NULL,
            sensor_id TEXT,
            spatial_position TEXT,
            indicator_type TEXT,
            unit TEXT,
            description TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE warning_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            mine_id TEXT NOT NULL,
            dynamic_risk REAL NOT NULL,
            static_risk REAL NOT NULL,
            combined_risk REAL NOT NULL,
            risk_level TEXT NOT NULL,
            heatmap_data TEXT,
            sensor_contribution TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE model_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX idx_dynamic_timestamp ON dynamic_sensor_data(timestamp)
    ''')
    cursor.execute('''
        CREATE INDEX idx_dynamic_sensor ON dynamic_sensor_data(sensor_id)
    ''')
    cursor.execute('''
        CREATE INDEX idx_warning_timestamp ON warning_results(timestamp)
    ''')
    
    configs = [
        ('model_path', 'best_63node.pt', '训练好的模型权重文件路径'),
        ('scaler_a_path', 'scaler_a.pkl', 'A类传感器数据标准化器路径'),
        ('scaler_b_path', 'scaler_b.pkl', 'B类指标数据标准化器路径'),
        ('scaler_static_path', 'scaler_static.pkl', '静态属性数据标准化器路径'),
        ('seq_len', '60', '模型输入序列长度(分钟)'),
        ('pred_horizon', '5', '预测时间步长(分钟)'),
        ('alpha', '0.25', '静态风险权重系数'),
        ('n_dynamic_nodes', '63', '动态监测节点数'),
        ('risk_threshold_low', '0.3', '低风险阈值'),
        ('risk_threshold_medium', '0.5', '中风险阈值'),
        ('risk_threshold_high', '0.7', '高风险阈值'),
    ]
    
    for key, value, desc in configs:
        cursor.execute('''
            INSERT INTO model_config (config_key, config_value, description)
            VALUES (?, ?, ?)
        ''', (key, value, desc))
    
    conn.commit()
    conn.close()
    print(f"数据库 {DB_PATH} 创建成功！")

if __name__ == '__main__':
    init_database()
