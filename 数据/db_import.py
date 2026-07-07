import sqlite3
import pandas as pd
import numpy as np
import os

import sys
from pathlib import Path
_WARN_DIR = Path(__file__).resolve().parent.parent / "\u9884\u8b66"
if str(_WARN_DIR) not in sys.path:
    sys.path.insert(0, str(_WARN_DIR))
_ABS_DB = str(_WARN_DIR / "outburst_warning.db")
DB_PATH = _ABS_DB
GEN_DATA_PATH = '动态数据（物理约束生成）.csv'
SENSOR_DIR = '动态数据（真实传感器）'
STATIC_PATH = '虚拟矿井32项静态数据_50条.csv'
META_PATH = '动态空间数据指标总览.xlsx'

def compute_static_risk_index(row):
    from 模糊数学评价 import fuzzy_comprehensive_evaluation
    fuzzy_input = {
        "煤层瓦斯压力": row.get('煤层瓦斯压力_MPa', 0),
        "煤坚固性系数": row.get('煤坚固性系数_f', 1),
        "瓦斯放散初速度": row.get('瓦斯放散初速度_mmHg', 0),
        "煤层埋藏深度": row.get('煤层埋藏深度_m', 0),
        "地质构造": {'无构造': 0, '一般构造': 1, '复杂构造': 2}.get(
            row.get('地质构造类型', '无构造'), 0
        ),
        "断层距工作面距离": row.get('断层距工作面距离_m', 1000),
        "工作面与构造带距离": row.get('工作面与构造带距离_m', 1000),
        "突出危险性综合指标D": row.get('D值', 0),
        "突出危险性综合指标K": row.get('K值', 0),
        "煤层厚度": row.get('煤层厚度_m', 0),
        "煤层倾角": row.get('煤层倾角_°', 0),
        "煤层自燃倾向性": {'不易自燃': 0, '自燃': 1, '容易自燃': 2}.get(
            row.get('煤层自燃倾向性', '不易自燃'), 0
        ),
        "主通风系统合理性": {'合理': 0, '待改善': 1, '不合理': 2}.get(
            row.get('主通风系统合理性', '合理'), 0
        ),
        "瓦斯抽采效果检验达标": bool(row.get('瓦斯抽采效果达标', 1)),
        "瓦斯抽采效果接续合理": bool(row.get('瓦斯抽采接续合理', 1)),
        "风速异常报警次数": row.get('风速异常报警次数', 0),
        "局部通风机馈电异常次数": row.get('局部通风机馈电异常次数', 0),
        "甲烷电风电闭锁失效次数": row.get('甲烷电风电闭锁失效次数', 0),
        "瓦斯传感器超限时长": row.get('瓦斯传感器超限时长_min', 0),
        "瓦斯传感器超限次数": row.get('瓦斯传感器超限次数', 0),
        "应断未断电次数": row.get('应断未断电次数', 0),
        "瓦检员空班漏检假检次数": row.get('瓦检员空班漏检假检次数', 0),
        "通风专业瓦斯相关三违数量": row.get('通风瓦斯三违数量', 0),
        "安全培训率": row.get('安全培训率', 1),
        "持证上岗率": row.get('持证上岗率', 1),
        "吨煤安全费用提取": row.get('吨煤安全费用_元', 0),
        "矿井瓦斯等级": {'低瓦斯': 0, '高瓦斯': 1, '突出': 2}.get(
            row.get('矿井瓦斯等级', '低瓦斯'), 0
        ),
        "火源管理合规": bool(row.get('火源管理合规', 1)),
        "有防灭火设计": bool(row.get('有防灭火设计', 1)),
        "支护材料可燃": bool(row.get('支护材料可燃', 0)),
        "煤尘爆炸指数": row.get('煤尘爆炸指数', 0),
        "瓦斯爆炸类隐患数量": row.get('瓦斯爆炸隐患数量', 0),
        "事故历史": (bool(row.get('有事故历史', 0)), 
                   row.get('事故严重程度', 0))
    }
    result = fuzzy_comprehensive_evaluation(fuzzy_input)
    S = 1 - (result['综合评分'] / 100)
    return S, result

def import_dynamic_data():
    conn = sqlite3.connect(DB_PATH)
    
    print("[1/4] 导入物理约束生成数据...")
    df_gen = pd.read_csv(GEN_DATA_PATH)
    df_gen['timestamp'] = pd.to_datetime(df_gen['timestamp'])
    df_gen = df_gen.sort_values('timestamp').reset_index(drop=True)
    
    b_cols = [c for c in df_gen.columns if c.startswith('B')]
    dynamic_cols = b_cols + ['risk_state', 'risk_score']
    
    records = []
    for _, row in df_gen.iterrows():
        ts = row['timestamp'].isoformat()
        for col in b_cols:
            value = row[col]
            if pd.notna(value):
                records.append((ts, col, 'B', float(value)))
    
    conn.executemany('''
        INSERT OR IGNORE INTO dynamic_sensor_data (timestamp, sensor_id, sensor_type, value)
        VALUES (?, ?, ?, ?)
    ''', records)
    conn.commit()
    print(f"  导入 {len(records)} 条B类指标数据")
    
    print("[2/4] 导入真实传感器数据...")
    a_sensor_files = sorted([f for f in os.listdir(SENSOR_DIR) if f.endswith('.db')])
    total_a_records = 0
    
    for filename in a_sensor_files:
        filepath = os.path.join(SENSOR_DIR, filename)
        sensor_id = filename.replace('.db', '')
        
        try:
            sensor_conn = sqlite3.connect(filepath)
            df_a = pd.read_sql('SELECT * FROM db202502', sensor_conn)
            try:
                df_a = pd.concat([df_a, pd.read_sql('SELECT * FROM db202503', sensor_conn)], ignore_index=True)
            except:
                pass
            sensor_conn.close()
            
            df_a['timestamp'] = pd.to_datetime(df_a['date'])
            df_a = df_a.sort_values('timestamp').reset_index(drop=True)
            
            a_records = []
            for _, row in df_a.iterrows():
                ts = row['timestamp'].isoformat()
                value = row['value']
                if pd.notna(value):
                    a_records.append((ts, sensor_id, 'A', float(value)))
            
            conn.executemany('''
                INSERT OR IGNORE INTO dynamic_sensor_data (timestamp, sensor_id, sensor_type, value)
                VALUES (?, ?, ?, ?)
            ''', a_records)
            total_a_records += len(a_records)
            print(f"  导入 {sensor_id}: {len(a_records)} 条")
        except Exception as e:
            print(f"  跳过 {sensor_id}: {e}")
    
    conn.commit()
    print(f"  共导入 {total_a_records} 条A类传感器数据")
    
    conn.close()

def import_static_data():
    conn = sqlite3.connect(DB_PATH)
    
    print("[3/4] 导入静态矿井数据...")
    df_static = pd.read_csv(STATIC_PATH)
    
    first_row = df_static.iloc[0].to_dict()
    
    S, fuzzy_result = compute_static_risk_index(first_row)
    
    static_record = {
        'mine_id': first_row.get('样本编号', 'M001'),
        'mine_type': first_row.get('矿井类型'),
        'gas_pressure_MPa': float(first_row.get('煤层瓦斯压力_MPa', 0)),
        'coal_firmness_f': float(first_row.get('煤坚固性系数_f', 0)),
        'gas_diffusion_velocity_mmHg': float(first_row.get('瓦斯放散初速度_mmHg', 0)),
        'burial_depth_m': float(first_row.get('煤层埋藏深度_m', 0)),
        'geological_structure': first_row.get('地质构造类型'),
        'fault_distance_m': float(first_row.get('断层距工作面距离_m', 0)),
        'structure_distance_m': float(first_row.get('工作面与构造带距离_m', 0)),
        'd_value': float(first_row.get('D值', 0)),
        'k_value': float(first_row.get('K值', 0)),
        'coal_thickness_m': float(first_row.get('煤层厚度_m', 0)),
        'dip_angle_deg': float(first_row.get('煤层倾角_°', 0)),
        'spontaneous_combustion': first_row.get('煤层自燃倾向性'),
        'ventilation_system': first_row.get('主通风系统合理性'),
        'gas_extraction_qualified': int(first_row.get('瓦斯抽采效果达标', 0)),
        'gas_extraction_continuous': int(first_row.get('瓦斯抽采接续合理', 0)),
        'prevention_score': float(first_row.get('综合防治措施总分', 0)),
        'wind_speed_alarm_count': int(first_row.get('风速异常报警次数', 0)),
        'fan_abnormal_count': int(first_row.get('局部通风机馈电异常次数', 0)),
        'power_cutoff_fail_count': int(first_row.get('甲烷电风电闭锁失效次数', 0)),
        'sensor_overrun_duration_min': float(first_row.get('瓦斯传感器超限时长_min', 0)),
        'sensor_overrun_count': int(first_row.get('瓦斯传感器超限次数', 0)),
        'power_cutoff_miss_count': int(first_row.get('应断未断电次数', 0)),
        'inspector_violation_count': int(first_row.get('瓦检员空班漏检假检次数', 0)),
        'ventilation_violation_count': int(first_row.get('通风瓦斯三违数量', 0)),
        'training_rate': float(first_row.get('安全培训率', 0)),
        'certificate_rate': float(first_row.get('持证上岗率', 0)),
        'safety_cost_per_ton': float(first_row.get('吨煤安全费用_元', 0)),
        'gas_level': first_row.get('矿井瓦斯等级'),
        'ignition_management_compliant': int(first_row.get('火源管理合规', 0)),
        'fire_prevention_design': int(first_row.get('有防灭火设计', 0)),
        'support_material_flammable': int(first_row.get('支护材料可燃', 0)),
        'dust_explosion_index': float(first_row.get('煤尘爆炸指数', 0)),
        'gas_explosion_hazard_count': int(first_row.get('瓦斯爆炸隐患数量', 0)),
        'has_accident_history': int(first_row.get('有事故历史', 0)),
        'accident_severity': int(first_row.get('事故严重程度', 0)),
        'fuzzy_score': float(fuzzy_result['综合评分']),
        'risk_level': fuzzy_result['风险等级'],
        'red_line_triggered': int(fuzzy_result['红线触发']),
        'static_risk_index': float(S),
    }
    
    conn.execute('''
        INSERT OR REPLACE INTO static_mine_data (
            mine_id, mine_type, gas_pressure_MPa, coal_firmness_f,
            gas_diffusion_velocity_mmHg, burial_depth_m, geological_structure,
            fault_distance_m, structure_distance_m, d_value, k_value,
            coal_thickness_m, dip_angle_deg, spontaneous_combustion,
            ventilation_system, gas_extraction_qualified, gas_extraction_continuous,
            prevention_score, wind_speed_alarm_count, fan_abnormal_count,
            power_cutoff_fail_count, sensor_overrun_duration_min, sensor_overrun_count,
            power_cutoff_miss_count, inspector_violation_count, ventilation_violation_count,
            training_rate, certificate_rate, safety_cost_per_ton, gas_level,
            ignition_management_compliant, fire_prevention_design, support_material_flammable,
            dust_explosion_index, gas_explosion_hazard_count, has_accident_history,
            accident_severity, fuzzy_score, risk_level, red_line_triggered, static_risk_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', tuple(static_record.values()))
    
    conn.commit()
    print(f"  导入静态数据: {static_record['mine_id']}, 静态风险指数: {S:.4f}, 风险等级: {fuzzy_result['风险等级']}")
    
    conn.close()

def import_meta_data():
    conn = sqlite3.connect(DB_PATH)
    
    print("[4/4] 导入元数据...")
    df_meta = pd.read_excel(META_PATH)
    
    a_sensor_files = sorted([f for f in os.listdir(SENSOR_DIR) if f.endswith('.db')])
    a_sensor_ids = [f.replace('.db', '') for f in a_sensor_files]
    
    meta_records = []
    for idx, row in df_meta.iterrows():
        indicator_name = row.get('监测指标', '')
        spatial_position = row.get('空间位置', '')
        sensor_id = None
        
        if idx < len(a_sensor_ids):
            sensor_id = a_sensor_ids[idx]
            indicator_type = 'A'
        else:
            indicator_type = 'B'
            sensor_id = f"B{idx - len(a_sensor_ids) + 1}"
        
        meta_records.append((
            indicator_name, sensor_id, spatial_position, indicator_type, '', ''
        ))
    
    conn.executemany('''
        INSERT OR IGNORE INTO meta_info (indicator_name, sensor_id, spatial_position, indicator_type, unit, description)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', meta_records)
    
    conn.commit()
    print(f"  导入 {len(meta_records)} 条元数据")
    
    conn.close()

def main():
    if not os.path.exists(DB_PATH):
        print("数据库不存在，请先运行 db_init.py")
        return
    
    import_dynamic_data()
    import_static_data()
    import_meta_data()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM dynamic_sensor_data')
    dynamic_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM static_mine_data')
    static_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM meta_info')
    meta_count = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"\n数据导入完成！")
    print(f"  动态传感器数据: {dynamic_count} 条")
    print(f"  静态矿井数据: {static_count} 条")
    print(f"  元数据: {meta_count} 条")

if __name__ == '__main__':
    main()
