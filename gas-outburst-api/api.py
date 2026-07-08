from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json
import numpy as np
from typing import Optional, List, Dict, Any
from apscheduler.schedulers.background import BackgroundScheduler
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="瓦斯突出动态预警系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()
is_auto_running = False
current_cycle_index = 0
total_cycles = 0

DB_PATH = 'outburst_warning.db'

class SensorDataRequest(BaseModel):
    sensor_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    limit: int = 100

class WarningResult(BaseModel):
    timestamp: str
    mine_id: str
    dynamic_risk: float
    static_risk: float
    combined_risk: float
    risk_level: str
    heatmap_data: Optional[str] = None
    sensor_contribution: Optional[str] = None

class StaticRiskRequest(BaseModel):
    gas_pressure_MPa: float = 0.0
    coal_firmness_f: float = 1.0
    gas_diffusion_velocity_mmHg: float = 0.0
    burial_depth_m: float = 0.0
    geological_structure: str = "无构造"
    fault_distance_m: float = 1000.0
    structure_distance_m: float = 1000.0
    d_value: float = 0.0
    k_value: float = 0.0
    coal_thickness_m: float = 0.0
    dip_angle_deg: float = 0.0
    spontaneous_combustion: str = "不易自燃"
    ventilation_system: str = "合理"
    gas_extraction_qualified: bool = True
    gas_extraction_continuous: bool = True
    prevention_score: float = 0.0
    wind_speed_alarm_count: int = 0
    fan_abnormal_count: int = 0
    power_cutoff_fail_count: int = 0
    sensor_overrun_duration_min: float = 0.0
    sensor_overrun_count: int = 0
    power_cutoff_miss_count: int = 0
    inspector_violation_count: int = 0
    ventilation_violation_count: int = 0
    training_rate: float = 1.0
    certificate_rate: float = 1.0
    safety_cost_per_ton: float = 0.0
    gas_level: str = "低瓦斯"
    ignition_management_compliant: bool = True
    fire_prevention_design: bool = True
    support_material_flammable: bool = False
    dust_explosion_index: float = 0.0
    gas_explosion_hazard_count: int = 0
    has_accident_history: bool = False
    accident_severity: int = 0

class PredictRequest(BaseModel):
    static_risk: Optional[float] = None

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/")
def root():
    return {"message": "瓦斯突出动态预警系统 API", "version": "1.0.0"}

@app.get("/api/health")
def health_check():
    try:
        conn = get_db_connection()
        conn.execute('SELECT COUNT(*) FROM dynamic_sensor_data')
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/api/sensors")
def get_sensors():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT sensor_id, sensor_type FROM dynamic_sensor_data ORDER BY sensor_type, sensor_id')
    sensors = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"sensors": sensors, "count": len(sensors)}

@app.get("/api/sensor-data")
def get_sensor_data(
    sensor_id: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=10000)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT timestamp, sensor_id, sensor_type, value FROM dynamic_sensor_data WHERE 1=1'
    params = []
    
    if sensor_id:
        query += ' AND sensor_id = ?'
        params.append(sensor_id)
    
    if start_time:
        query += ' AND timestamp >= ?'
        params.append(start_time)
    
    if end_time:
        query += ' AND timestamp <= ?'
        params.append(end_time)
    
    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"data": data, "count": len(data)}

@app.get("/api/sensor-data/recent")
def get_recent_sensor_data(limit: int = Query(60, ge=1, le=1000)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT MAX(timestamp) FROM dynamic_sensor_data')
    max_ts = cursor.fetchone()[0]
    
    if not max_ts:
        conn.close()
        return {"data": [], "count": 0}
    
    cursor.execute('''
        SELECT timestamp, sensor_id, sensor_type, value 
        FROM dynamic_sensor_data 
        WHERE timestamp <= ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (max_ts, limit))
    
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"data": data, "count": len(data), "latest_timestamp": max_ts}

@app.get("/api/static-data")
def get_static_data(mine_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if mine_id:
        cursor.execute('SELECT * FROM static_mine_data WHERE mine_id = ?', (mine_id,))
    else:
        cursor.execute('SELECT * FROM static_mine_data LIMIT 1')
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    raise HTTPException(status_code=404, detail="静态数据未找到")

@app.get("/api/meta")
def get_meta_info(indicator_type: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM meta_info WHERE 1=1'
    params = []
    
    if indicator_type:
        query += ' AND indicator_type = ?'
        params.append(indicator_type)
    
    query += ' ORDER BY id'
    cursor.execute(query, params)
    
    meta = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"meta": meta, "count": len(meta)}

@app.get("/api/warnings")
def get_warning_history(
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM warning_results WHERE 1=1'
    params = []
    
    if start_time:
        query += ' AND timestamp >= ?'
        params.append(start_time)
    
    if end_time:
        query += ' AND timestamp <= ?'
        params.append(end_time)
    
    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    warnings = []
    for row in cursor.fetchall():
        row_dict = dict(row)
        if row_dict.get('heatmap_data'):
            row_dict['heatmap_data'] = json.loads(row_dict['heatmap_data'])
        if row_dict.get('sensor_contribution'):
            row_dict['sensor_contribution'] = json.loads(row_dict['sensor_contribution'])
        warnings.append(row_dict)
    
    conn.close()
    
    return {"warnings": warnings, "count": len(warnings)}

@app.get("/api/warnings/latest")
def get_latest_warning():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM warning_results ORDER BY timestamp DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    
    if row:
        row_dict = dict(row)
        if row_dict.get('heatmap_data'):
            row_dict['heatmap_data'] = json.loads(row_dict['heatmap_data'])
        if row_dict.get('sensor_contribution'):
            row_dict['sensor_contribution'] = json.loads(row_dict['sensor_contribution'])
        return row_dict
    raise HTTPException(status_code=404, detail="暂无预警记录")

@app.post("/api/static-risk")
def compute_static_risk(request: StaticRiskRequest):
    from 模糊数学评价 import fuzzy_comprehensive_evaluation
    
    fuzzy_input = {
        "煤层瓦斯压力": request.gas_pressure_MPa,
        "煤坚固性系数": request.coal_firmness_f,
        "瓦斯放散初速度": request.gas_diffusion_velocity_mmHg,
        "煤层埋藏深度": request.burial_depth_m,
        "地质构造": {'无构造': 0, '一般构造': 1, '复杂构造': 2}.get(request.geological_structure, 0),
        "断层距工作面距离": request.fault_distance_m,
        "工作面与构造带距离": request.structure_distance_m,
        "突出危险性综合指标D": request.d_value,
        "突出危险性综合指标K": request.k_value,
        "煤层厚度": request.coal_thickness_m,
        "煤层倾角": request.dip_angle_deg,
        "煤层自燃倾向性": {'不易自燃': 0, '自燃': 1, '容易自燃': 2}.get(request.spontaneous_combustion, 0),
        "主通风系统合理性": {'合理': 0, '待改善': 1, '不合理': 2}.get(request.ventilation_system, 0),
        "瓦斯抽采效果检验达标": request.gas_extraction_qualified,
        "瓦斯抽采效果接续合理": request.gas_extraction_continuous,
        "风速异常报警次数": request.wind_speed_alarm_count,
        "局部通风机馈电异常次数": request.fan_abnormal_count,
        "甲烷电风电闭锁失效次数": request.power_cutoff_fail_count,
        "瓦斯传感器超限时长": request.sensor_overrun_duration_min,
        "瓦斯传感器超限次数": request.sensor_overrun_count,
        "应断未断电次数": request.power_cutoff_miss_count,
        "瓦检员空班漏检假检次数": request.inspector_violation_count,
        "通风专业瓦斯相关三违数量": request.ventilation_violation_count,
        "安全培训率": request.training_rate,
        "持证上岗率": request.certificate_rate,
        "吨煤安全费用提取": request.safety_cost_per_ton,
        "矿井瓦斯等级": {'低瓦斯': 0, '高瓦斯': 1, '突出': 2}.get(request.gas_level, 0),
        "火源管理合规": request.ignition_management_compliant,
        "有防灭火设计": request.fire_prevention_design,
        "支护材料可燃": request.support_material_flammable,
        "煤尘爆炸指数": request.dust_explosion_index,
        "瓦斯爆炸类隐患数量": request.gas_explosion_hazard_count,
        "事故历史": (request.has_accident_history, request.accident_severity)
    }
    
    result = fuzzy_comprehensive_evaluation(fuzzy_input)
    static_risk_index = 1 - (result['综合评分'] / 100)
    
    return {
        "fuzzy_score": result['综合评分'],
        "risk_level": result['风险等级'],
        "red_line_triggered": result['红线触发'],
        "red_line_reason": result['红线原因'],
        "static_risk_index": static_risk_index,
        "fuzzy_vector": result['模糊向量B'],
        "max_membership_level": result['最大隶属度等级'],
        "max_membership_value": result['最大隶属度值'],
        "individual_scores": result['各项评分']
    }

@app.post("/api/predict")
def predict(request: PredictRequest = None):
    try:
        from model_inference import inference
        
        static_risk = request.static_risk if request else None
        result = inference.predict(static_risk=static_risk)
        
        if result is None:
            raise HTTPException(status_code=500, detail="推理失败，数据库中无足够数据")
        
        sensor_contribution = inference.get_sensor_contribution(np.array(result['heatmap']))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT mine_id FROM static_mine_data LIMIT 1')
        mine_id_row = cursor.fetchone()
        mine_id = mine_id_row['mine_id'] if mine_id_row else 'M001'
        
        cursor.execute('''
            INSERT INTO warning_results (
                timestamp, mine_id, dynamic_risk, static_risk, 
                combined_risk, risk_level, heatmap_data, sensor_contribution
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            result['timestamp'],
            mine_id,
            result['dynamic_risk'],
            result['static_risk'],
            result['combined_risk'],
            result['risk_level'],
            json.dumps(result['heatmap']),
            json.dumps(sensor_contribution)
        ))
        
        conn.commit()
        conn.close()
        
        result['sensor_contribution'] = sensor_contribution
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推理错误: {str(e)}")

@app.post("/api/predict-batch")
def predict_batch(request: dict):
    try:
        from model_inference import inference
        
        data = request.get('data', [])
        if not data:
            raise HTTPException(status_code=400, detail="未提供数据")
        
        results = []
        for item in data:
            X_seq = np.array(item.get('X_seq')) if item.get('X_seq') else None
            static_risk = item.get('static_risk')
            
            result = inference.predict(X_seq=X_seq, static_risk=static_risk)
            if result:
                results.append(result)
        
        return {"results": results, "count": len(results)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量推理错误: {str(e)}")

@app.get("/api/config")
def get_config(config_key: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if config_key:
        cursor.execute('SELECT * FROM model_config WHERE config_key = ?', (config_key,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        raise HTTPException(status_code=404, detail=f"配置项 {config_key} 未找到")
    else:
        cursor.execute('SELECT * FROM model_config ORDER BY id')
        configs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"configs": configs}

@app.put("/api/config")
def update_config(config_key: str, config_value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE model_config 
        SET config_value = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE config_key = ?
    ''', (config_value, config_key))
    
    conn.commit()
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail=f"配置项 {config_key} 未找到")
    
    cursor.execute('SELECT * FROM model_config WHERE config_key = ?', (config_key,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row)

@app.get("/api/stats")
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM dynamic_sensor_data')
    dynamic_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM static_mine_data')
    static_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM meta_info')
    meta_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM warning_results')
    warning_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT MAX(timestamp) FROM dynamic_sensor_data')
    latest_dynamic = cursor.fetchone()[0]
    
    cursor.execute('SELECT MAX(timestamp) FROM warning_results')
    latest_warning = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "dynamic_sensor_count": dynamic_count,
        "static_mine_count": static_count,
        "meta_count": meta_count,
        "warning_count": warning_count,
        "latest_dynamic_data": latest_dynamic,
        "latest_warning": latest_warning
    }

def scheduled_predict():
    global current_cycle_index, total_cycles
    try:
        from model_inference import inference
        from datetime import datetime
        
        logger.info(f"[定时推理] 第 {current_cycle_index + 1} 次推理开始...")
        logger.info(f"[定时推理] 数据池大小: {inference.total_pool_samples}, 当前索引: {inference.current_pool_index}, 序列长度: {inference.seq_len}")
        result = inference.predict()
        
        if result is None:
            logger.warning("[定时推理] 推理失败，数据库中无足够数据")
            return
        
        sensor_contribution = inference.get_sensor_contribution(np.array(result['heatmap']))
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT mine_id FROM static_mine_data LIMIT 1')
        mine_id_row = cursor.fetchone()
        mine_id = mine_id_row['mine_id'] if mine_id_row else 'M001'
        
        current_timestamp = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO warning_results (
                timestamp, mine_id, dynamic_risk, static_risk, 
                combined_risk, risk_level, heatmap_data, sensor_contribution
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            current_timestamp,
            mine_id,
            result['dynamic_risk'],
            result['static_risk'],
            result['combined_risk'],
            result['risk_level'],
            json.dumps(result['heatmap']),
            json.dumps(sensor_contribution)
        ))
        
        conn.commit()
        conn.close()
        
        current_cycle_index += 1
        total_cycles += 1
        
        logger.info(f"[定时推理] 完成！动态风险: {result['dynamic_risk']:.4f}, 静态风险: {result['static_risk']:.4f}, 综合风险: {result['combined_risk']:.4f}, 等级: {result['risk_level']}")
        
    except Exception as e:
        logger.error(f"[定时推理] 错误: {str(e)}")

@app.get("/api/auto-predict/status")
def get_auto_predict_status():
    return {
        "is_running": is_auto_running,
        "current_cycle": current_cycle_index,
        "total_cycles": total_cycles,
        "next_run_time": str(scheduler.get_job('scheduled_predict').next_run_time) if scheduler.get_job('scheduled_predict') else None
    }

@app.post("/api/auto-predict/start")
def start_auto_predict(interval: int = 60):
    global is_auto_running
    
    if is_auto_running:
        logger.info(f"定时推理已在运行中，当前间隔: {interval}秒")
        return {"message": "定时推理已在运行中", "interval": interval}
    
    scheduler.add_job(scheduled_predict, 'interval', seconds=interval, id='scheduled_predict', max_instances=1)
    scheduler.start()
    is_auto_running = True
    
    logger.info(f"定时推理已启动，间隔: {interval}秒")
    return {
        "message": "定时推理已启动",
        "interval_seconds": interval,
        "is_running": True,
        "info": f"每 {interval} 秒自动调用一次模型推理，循环使用数据库中的历史数据"
    }

@app.post("/api/auto-predict/stop")
def stop_auto_predict():
    global is_auto_running
    
    if not is_auto_running:
        return {"message": "定时推理未在运行"}
    
    scheduler.remove_job('scheduled_predict')
    scheduler.shutdown(wait=False)
    is_auto_running = False
    
    logger.info("定时推理已停止")
    return {"message": "定时推理已停止", "is_running": False}

@app.post("/api/auto-predict/reset")
def reset_auto_predict():
    global current_cycle_index, total_cycles
    current_cycle_index = 0
    total_cycles = 0
    return {"message": "循环计数器已重置", "current_cycle": 0, "total_cycles": 0}

class FrontendStaticEvaluationRequest(BaseModel):
    mine_id: str = "M001"
    coal_gas_pressure: float = 0.0
    coal_firmness: float = 1.0
    gas_diffusion_velocity: float = 0.0
    burial_depth: float = 0.0
    geological_structure: int = 0
    fault_distance: float = 1000.0
    structure_distance: float = 1000.0
    danger_indicator_d: float = 0.0
    danger_indicator_k: float = 0.0
    coal_thickness: float = 0.0
    dip_angle: float = 0.0
    spontaneous_combustion: int = 0
    ventilation_system_type: int = 0
    gas_extraction_qualified: bool = True
    gas_extraction_continuity: bool = True
    wind_speed_alarm_count: int = 0
    fan_feeder_abnormal_count: int = 0
    power_cutoff_failure_count: int = 0
    gas_sensor_overrun_duration: float = 0.0
    gas_sensor_overrun_count: int = 0
    power_cutoff_miss_count: int = 0
    gas_inspector_violation_count: int = 0
    ventilation_violation_count: int = 0
    training_rate: float = 1.0
    certificate_rate: float = 1.0
    safety_cost_per_ton: float = 0.0
    gas_level: int = 0
    ignition_management: bool = True
    fire_prevention_design: bool = True
    support_material_flammable: bool = False
    dust_explosion_index: float = 0.0
    gas_explosion_hazard_count: int = 0
    accident_history: bool = False
    accident_severity: int = 0

class FrontendDynamicPredictionRequest(BaseModel):
    mine_id: str = "M001"
    dynamic_seq: Optional[List[List[List[float]]]] = None
    static_data: Optional[List[float]] = None

class FrontendComprehensiveRiskRequest(BaseModel):
    mine_id: str = "M001"
    static_risk_index_s: float = 0.5
    dynamic_risk_prob: float = 0.5

@app.post("/api/knowledge/static/risk-assessment")
def frontend_static_risk_assessment(request: FrontendStaticEvaluationRequest):
    from 模糊数学评价 import fuzzy_comprehensive_evaluation
    
    fuzzy_input = {
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
        "事故历史": (request.accident_history, request.accident_severity)
    }
    
    result = fuzzy_comprehensive_evaluation(fuzzy_input)
    static_risk_index = 1 - (result['综合评分'] / 100)
    
    risk_level_code = 0
    if static_risk_index >= 0.9:
        risk_level_code = 4
    elif static_risk_index >= 0.7:
        risk_level_code = 3
    elif static_risk_index >= 0.5:
        risk_level_code = 2
    elif static_risk_index >= 0.3:
        risk_level_code = 1
    
    return {
        "success": True,
        "mine_id": request.mine_id,
        "static_risk_index_s": static_risk_index,
        "composite_score": result['综合评分'],
        "risk_level": result['风险等级'],
        "red_line_triggered": result['红线触发'],
        "red_line_reason": result['红线原因'],
        "fuzzy_vector_b": result['模糊向量B'],
        "max_membership_level": result['最大隶属度等级'],
        "indicator_scores": result['各项评分'],
        "risk_level_code": risk_level_code
    }

@app.post("/api/knowledge/dynamic/predict")
def frontend_dynamic_predict(request: FrontendDynamicPredictionRequest):
    try:
        from model_inference import inference
        
        static_risk = None
        if request.static_data:
            static_risk = float(request.static_data[0]) if request.static_data else None
        
        X_seq = None
        if request.dynamic_seq:
            X_seq = np.array(request.dynamic_seq)
        
        result = inference.predict(X_seq=X_seq, static_risk=static_risk)
        
        if result is None:
            return {
                "success": False,
                "mine_id": request.mine_id,
                "message": "推理失败，数据库中无足够数据"
            }
        
        risk_level_code = 0
        if result['dynamic_risk'] >= 0.9:
            risk_level_code = 4
        elif result['dynamic_risk'] >= 0.7:
            risk_level_code = 3
        elif result['dynamic_risk'] >= 0.5:
            risk_level_code = 2
        elif result['dynamic_risk'] >= 0.3:
            risk_level_code = 1
        
        heatmap = np.array(result['heatmap'])
        attention_weights = heatmap.tolist()
        
        return {
            "success": True,
            "mine_id": request.mine_id,
            "risk_prob": result['dynamic_risk'],
            "risk_level": result['risk_level'],
            "risk_level_code": risk_level_code,
            "attention_weights": attention_weights,
            "prevention_advice": {
                "level": result['risk_level'],
                "level_code": risk_level_code,
                "color": "#ef4444" if risk_level_code >= 3 else "#f59e0b" if risk_level_code == 2 else "#3b82f6" if risk_level_code == 1 else "#22c55e",
                "primary_prevention": "加强瓦斯抽采，确保抽采效果达标",
                "secondary_prevention": "加强监测监控，及时发现异常",
                "risk_source": "瓦斯异常涌出",
                "urgency": "紧急" if risk_level_code >= 3 else "一般" if risk_level_code == 2 else "低" if risk_level_code == 1 else "无",
                "actions": ["加强通风管理", "人员撤离准备", "启动应急预案"]
            },
            "sample_data_info": {
                "dynamic_seq_shape": [60, 63, 1],
                "static_data_shape": [32],
                "num_sensors": 63,
                "seq_len": 60,
                "input_dim": 63,
                "static_dim": 32
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "mine_id": request.mine_id,
            "message": str(e)
        }

@app.post("/api/knowledge/dynamic/predict-sample")
def frontend_dynamic_predict_sample(mine_id: Optional[str] = Query("M001")):
    try:
        from model_inference import inference
        
        result = inference.predict()
        
        if result is None:
            return {
                "success": False,
                "mine_id": mine_id,
                "message": "推理失败，数据库中无足够数据"
            }
        
        risk_level_code = 0
        if result['dynamic_risk'] >= 0.9:
            risk_level_code = 4
        elif result['dynamic_risk'] >= 0.7:
            risk_level_code = 3
        elif result['dynamic_risk'] >= 0.5:
            risk_level_code = 2
        elif result['dynamic_risk'] >= 0.3:
            risk_level_code = 1
        
        heatmap = np.array(result['heatmap'])
        attention_weights = heatmap.tolist()
        
        return {
            "success": True,
            "mine_id": mine_id,
            "risk_prob": result['dynamic_risk'],
            "risk_level": result['risk_level'],
            "risk_level_code": risk_level_code,
            "attention_weights": attention_weights,
            "prevention_advice": {
                "level": result['risk_level'],
                "level_code": risk_level_code,
                "color": "#ef4444" if risk_level_code >= 3 else "#f59e0b" if risk_level_code == 2 else "#3b82f6" if risk_level_code == 1 else "#22c55e",
                "primary_prevention": "加强瓦斯抽采，确保抽采效果达标",
                "secondary_prevention": "加强监测监控，及时发现异常",
                "risk_source": "瓦斯异常涌出",
                "urgency": "紧急" if risk_level_code >= 3 else "一般" if risk_level_code == 2 else "低" if risk_level_code == 1 else "无",
                "actions": ["加强通风管理", "人员撤离准备", "启动应急预案"]
            },
            "sample_data_info": {
                "dynamic_seq_shape": [60, 63, 1],
                "static_data_shape": [32],
                "num_sensors": 63,
                "seq_len": 60,
                "input_dim": 63,
                "static_dim": 32
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "mine_id": mine_id,
            "message": str(e)
        }

@app.post("/api/knowledge/comprehensive-risk")
def frontend_comprehensive_risk(request: FrontendComprehensiveRiskRequest):
    alpha = 0.25
    comprehensive_risk = alpha * request.static_risk_index_s + (1 - alpha) * request.dynamic_risk_prob
    
    risk_level_code = 0
    if comprehensive_risk >= 0.9:
        risk_level_code = 4
    elif comprehensive_risk >= 0.7:
        risk_level_code = 3
    elif comprehensive_risk >= 0.5:
        risk_level_code = 2
    elif comprehensive_risk >= 0.3:
        risk_level_code = 1
    
    risk_level = ""
    if risk_level_code == 4:
        risk_level = "重大"
    elif risk_level_code == 3:
        risk_level = "较大"
    elif risk_level_code == 2:
        risk_level = "一般"
    elif risk_level_code == 1:
        risk_level = "低"
    
    color = "#ef4444" if risk_level_code >= 3 else "#f59e0b" if risk_level_code == 2 else "#3b82f6" if risk_level_code == 1 else "#22c55e"
    
    return {
        "success": True,
        "mine_id": request.mine_id,
        "static_risk_index_s": request.static_risk_index_s,
        "dynamic_risk_prob": request.dynamic_risk_prob,
        "comprehensive_risk": comprehensive_risk,
        "risk_level": risk_level,
        "risk_level_code": risk_level_code,
        "color": color,
        "formula": "S = α × S_static + (1-α) × S_dynamic",
        "weights": {
            "static": alpha,
            "dynamic": 1 - alpha
        }
    }

@app.post("/api/knowledge/full-risk-assessment")
def frontend_full_risk_assessment(request: FrontendStaticEvaluationRequest):
    from 模糊数学评价 import fuzzy_comprehensive_evaluation
    from model_inference import inference
    
    fuzzy_input = {
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
        "事故历史": (request.accident_history, request.accident_severity)
    }
    
    static_result = fuzzy_comprehensive_evaluation(fuzzy_input)
    static_risk_index = 1 - (static_result['综合评分'] / 100)
    
    static_risk_code = 0
    if static_risk_index >= 0.9:
        static_risk_code = 4
    elif static_risk_index >= 0.7:
        static_risk_code = 3
    elif static_risk_index >= 0.5:
        static_risk_code = 2
    elif static_risk_index >= 0.3:
        static_risk_code = 1
    
    static_eval = {
        "success": True,
        "mine_id": request.mine_id,
        "static_risk_index_s": static_risk_index,
        "composite_score": static_result['综合评分'],
        "risk_level": static_result['风险等级'],
        "red_line_triggered": static_result['红线触发'],
        "red_line_reason": static_result['红线原因'],
        "fuzzy_vector_b": static_result['模糊向量B'],
        "max_membership_level": static_result['最大隶属度等级'],
        "indicator_scores": static_result['各项评分'],
        "risk_level_code": static_risk_code
    }
    
    try:
        dynamic_result = inference.predict(static_risk=static_risk_index)
        
        if dynamic_result:
            dynamic_risk_code = 0
            if dynamic_result['dynamic_risk'] >= 0.9:
                dynamic_risk_code = 4
            elif dynamic_result['dynamic_risk'] >= 0.7:
                dynamic_risk_code = 3
            elif dynamic_result['dynamic_risk'] >= 0.5:
                dynamic_risk_code = 2
            elif dynamic_result['dynamic_risk'] >= 0.3:
                dynamic_risk_code = 1
            
            heatmap = np.array(dynamic_result['heatmap'])
            
            dynamic_pred = {
                "success": True,
                "mine_id": request.mine_id,
                "risk_prob": dynamic_result['dynamic_risk'],
                "risk_level": dynamic_result['risk_level'],
                "risk_level_code": dynamic_risk_code,
                "attention_weights": heatmap.tolist(),
                "prevention_advice": {
                    "level": dynamic_result['risk_level'],
                    "level_code": dynamic_risk_code,
                    "color": "#ef4444" if dynamic_risk_code >= 3 else "#f59e0b" if dynamic_risk_code == 2 else "#3b82f6" if dynamic_risk_code == 1 else "#22c55e",
                    "primary_prevention": "加强瓦斯抽采，确保抽采效果达标",
                    "secondary_prevention": "加强监测监控，及时发现异常",
                    "risk_source": "瓦斯异常涌出",
                    "urgency": "紧急" if dynamic_risk_code >= 3 else "一般" if dynamic_risk_code == 2 else "低" if dynamic_risk_code == 1 else "无",
                    "actions": ["加强通风管理", "人员撤离准备", "启动应急预案"]
                }
            }
        else:
            dynamic_pred = None
    except Exception as e:
        dynamic_pred = None
    
    alpha = 0.25
    if dynamic_pred:
        comprehensive_risk = alpha * static_risk_index + (1 - alpha) * dynamic_pred['risk_prob']
        dynamic_prob = dynamic_pred['risk_prob']
    else:
        comprehensive_risk = static_risk_index
        dynamic_prob = static_risk_index
    
    comp_risk_code = 0
    if comprehensive_risk >= 0.9:
        comp_risk_code = 4
    elif comprehensive_risk >= 0.7:
        comp_risk_code = 3
    elif comprehensive_risk >= 0.5:
        comp_risk_code = 2
    elif comprehensive_risk >= 0.3:
        comp_risk_code = 1
    
    comp_risk_level = ""
    if comp_risk_code == 4:
        comp_risk_level = "重大"
    elif comp_risk_code == 3:
        comp_risk_level = "较大"
    elif comp_risk_code == 2:
        comp_risk_level = "一般"
    elif comp_risk_code == 1:
        comp_risk_level = "低"
    
    color = "#ef4444" if comp_risk_code >= 3 else "#f59e0b" if comp_risk_code == 2 else "#3b82f6" if comp_risk_code == 1 else "#22c55e"
    
    comprehensive = {
        "success": True,
        "mine_id": request.mine_id,
        "static_risk_index_s": static_risk_index,
        "dynamic_risk_prob": dynamic_prob,
        "comprehensive_risk": comprehensive_risk,
        "risk_level": comp_risk_level,
        "risk_level_code": comp_risk_code,
        "color": color,
        "formula": "S = α × S_static + (1-α) × S_dynamic",
        "weights": {
            "static": alpha,
            "dynamic": 1 - alpha
        }
    }
    
    return {
        "success": True,
        "mine_id": request.mine_id,
        "static_evaluation": static_eval,
        "dynamic_prediction": dynamic_pred,
        "comprehensive_risk": comprehensive
    }

@app.get("/api/knowledge/stats")
def frontend_knowledge_stats():
    stats = get_stats()
    return {
        "total_indicators": stats.get("meta_count", 0),
        "dynamic_indicators": 63,
        "static_indicators": 32,
        "total_rules": 20,
        "total_measures": 30,
        "total_cases": 50,
        "total_standards": 15,
        "total_clauses": 120,
        "total_version_records": 10
    }

@app.get("/api/knowledge/categories")
def frontend_categories():
    return ["瓦斯监测", "通风系统", "地质构造", "安全管理", "瓦斯抽采", "防灭火", "粉尘防治"]

@app.get("/api/knowledge/regions")
def frontend_regions():
    return ["东翼回风巷", "中部采掘区", "西翼运输巷", "主斜井", "1213采掘工作面", "回风联络巷"]

@app.get("/api/knowledge/indicators")
def frontend_indicators(
    keyword: Optional[str] = Query(None),
    indicator_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM meta_info WHERE 1=1'
    params = []
    
    if keyword:
        query += ' AND (indicator_name LIKE ? OR description LIKE ?)'
        params.append(f'%{keyword}%')
        params.append(f'%{keyword}%')
    
    if indicator_type:
        query += ' AND indicator_type = ?'
        params.append(indicator_type)
    
    if category:
        query += ' AND category LIKE ?'
        params.append(f'%{category}%')
    
    if risk_level:
        query += ' AND risk_level = ?'
        params.append(risk_level)
    
    query += ' ORDER BY id LIMIT 50'
    cursor.execute(query, params)
    
    indicators = []
    for row in cursor.fetchall():
        row_dict = dict(row)
        indicators.append({
            "id": str(row_dict.get("id", "")),
            "name": row_dict.get("indicator_name", ""),
            "symbol": row_dict.get("symbol", ""),
            "threshold": str(row_dict.get("threshold", "")),
            "weight": row_dict.get("weight"),
            "scoring_rule": row_dict.get("scoring_rule", ""),
            "description": row_dict.get("description", ""),
            "category": row_dict.get("category", ""),
            "region": row_dict.get("spatial_location", ""),
            "risk_level": row_dict.get("risk_level", ""),
            "type": row_dict.get("indicator_type", "")
        })
    
    conn.close()
    return indicators

@app.get("/api/knowledge/rules")
def frontend_rules(risk_level: Optional[str] = Query(None)):
    rules = [
        {"id": "R001", "rule_id": "R001", "hazard_id": "H001", "hazard_name": "瓦斯超限", "attribute": "浓度", "suggested_risk_level": "high", "measure": {"id": "M001", "content": "立即切断电源，撤离人员", "source": "煤矿安全规程"}, "standard": "AQ1029-2007", "version": "V1.0"},
        {"id": "R002", "rule_id": "R002", "hazard_id": "H002", "hazard_name": "风速异常", "attribute": "风速", "suggested_risk_level": "normal", "measure": {"id": "M002", "content": "调整通风系统", "source": "煤矿安全规程"}, "standard": "AQ1029-2007", "version": "V1.0"},
        {"id": "R003", "rule_id": "R003", "hazard_id": "H003", "hazard_name": "瓦斯抽采不达标", "attribute": "抽采效果", "suggested_risk_level": "critical", "measure": {"id": "M003", "content": "加强抽采，确保达标", "source": "煤矿安全规程"}, "standard": "AQ1029-2007", "version": "V1.0"},
    ]
    
    if risk_level:
        rules = [r for r in rules if r["suggested_risk_level"] == risk_level]
    
    return rules

@app.get("/api/knowledge/measures")
def frontend_measures(keyword: Optional[str] = Query(None)):
    measures = [
        {"id": "M001", "content": "立即切断电源，撤离人员", "source": "煤矿安全规程", "version": "V1.0"},
        {"id": "M002", "content": "调整通风系统", "source": "煤矿安全规程", "version": "V1.0"},
        {"id": "M003", "content": "加强抽采，确保达标", "source": "煤矿安全规程", "version": "V1.0"},
        {"id": "M004", "content": "加强监测监控", "source": "煤矿安全规程", "version": "V1.0"},
        {"id": "M005", "content": "启动应急预案", "source": "煤矿安全规程", "version": "V1.0"},
    ]
    
    if keyword:
        measures = [m for m in measures if keyword in m["content"]]
    
    return measures

@app.get("/api/knowledge/nl-query")
def frontend_nl_query(q: str):
    return {
        "query": q,
        "intent": "risk_assessment",
        "count": 1,
        "results": [],
        "counts": {},
        "message": f"查询 '{q}' 的相关风险信息"
    }

@app.get("/api/knowledge/risk/high-risk")
def frontend_high_risk_indicators():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM meta_info WHERE risk_level = "high" OR risk_level = "critical" LIMIT 20')
    
    indicators = []
    for row in cursor.fetchall():
        row_dict = dict(row)
        indicators.append({
            "id": str(row_dict.get("id", "")),
            "name": row_dict.get("indicator_name", ""),
            "symbol": row_dict.get("symbol", ""),
            "threshold": str(row_dict.get("threshold", "")),
            "weight": row_dict.get("weight"),
            "scoring_rule": row_dict.get("scoring_rule", ""),
            "description": row_dict.get("description", ""),
            "category": row_dict.get("category", ""),
            "region": row_dict.get("spatial_location", ""),
            "risk_level": row_dict.get("risk_level", ""),
            "type": row_dict.get("indicator_type", "")
        })
    
    conn.close()
    return indicators

@app.get("/api/knowledge/pg/status")
def frontend_pg_status():
    return {"available": False, "message": "PostgreSQL 未配置，使用 SQLite 数据库"}

@app.get("/api/knowledge/sensor-data")
def frontend_sensor_data(
    limit: Optional[int] = Query(60),
    region: Optional[str] = Query(None)
):
    from model_inference import inference
    
    if not inference._initialized:
        inference.initialize()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT sensor_id, indicator_name, unit, spatial_position 
        FROM meta_info
    ''')
    meta_data = {row['sensor_id']: {
        'indicator_name': row['indicator_name'],
        'unit': row['unit'],
        'spatial_position': row['spatial_position']
    } for row in cursor.fetchall()}
    
    conn.close()
    
    pool_data = inference.data_pool
    pool_timestamps = inference.data_pool_timestamps
    
    if pool_data is None or len(pool_data) == 0:
        return {"success": True, "data": [], "count": 0}
    
    current_idx = inference.current_pool_index
    start_idx = max(0, current_idx - limit)
    
    window_data = pool_data[start_idx:current_idx]
    window_timestamps = pool_timestamps[start_idx:current_idx]
    
    data = []
    for i in range(len(window_data)):
        mapped_timestamp = inference.map_to_real_time(window_timestamps[i])
        
        for j, sensor_id in enumerate(inference.sensor_order):
            meta = meta_data.get(sensor_id, {})
            
            if region and meta.get('spatial_position') and region.lower() not in meta['spatial_position'].lower():
                continue
            
            data.append({
                "timestamp": mapped_timestamp,
                "sensor_id": sensor_id,
                "sensor_name": meta.get('indicator_name', sensor_id),
                "unit": meta.get('unit', ""),
                "region": meta.get('spatial_position', ""),
                "value": float(window_data[i][j])
            })
    
    data = data[-limit:]
    
    return {"success": True, "data": data, "count": len(data)}

@app.get("/api/knowledge/warnings")
def frontend_warnings(
    limit: Optional[int] = Query(50)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM warning_results 
        ORDER BY timestamp DESC LIMIT ?
    ''', (limit,))
    
    warnings = []
    for row in cursor.fetchall():
        row_dict = dict(row)
        risk_level = row_dict.get("risk_level", "")
        combined_risk = row_dict.get("combined_risk", 0.0)
        
        risk_level_code = 0
        if combined_risk >= 0.9:
            risk_level_code = 4
        elif combined_risk >= 0.7:
            risk_level_code = 3
        elif combined_risk >= 0.5:
            risk_level_code = 2
        elif combined_risk >= 0.3:
            risk_level_code = 1
        
        heatmap_data = json.loads(row_dict.get("heatmap_data", "[]")) if row_dict.get("heatmap_data") else []
        
        prevention_advice = "加强监测监控，及时发现异常"
        if risk_level_code >= 3:
            prevention_advice = "紧急：立即切断电源，撤离人员，启动应急预案"
        elif risk_level_code == 2:
            prevention_advice = "加强瓦斯抽采，确保抽采效果达标"
        
        warnings.append({
            "id": str(row_dict.get("id", "")),
            "timestamp": row_dict.get("timestamp", ""),
            "risk_level": risk_level,
            "risk_level_code": risk_level_code,
            "risk_prob": row_dict.get("dynamic_risk", 0.0),
            "static_risk_index": row_dict.get("static_risk", 0.0),
            "comprehensive_risk": combined_risk,
            "prevention_advice": prevention_advice,
            "heatmap_data": heatmap_data,
            "attention_weights": heatmap_data
        })
    
    conn.close()
    
    return {"success": True, "warnings": warnings, "total": len(warnings)}

@app.get("/api/knowledge/heatmap")
def frontend_heatmap():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM warning_results ORDER BY timestamp DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    
    if row:
        row_dict = dict(row)
        heatmap_data = json.loads(row_dict.get("heatmap_data", "[]")) if row_dict.get("heatmap_data") else []
        
        cells = []
        regions = ["1213采掘工作面", "东翼回风巷", "中部采掘区", "西翼运输巷", "主斜井", "回风联络巷", "运输巷", "辅助巷道"]
        positions = [(15, 20), (35, 25), (55, 30), (75, 35), (25, 50), (45, 55), (65, 60), (85, 65)]
        
        for i, region_name in enumerate(regions):
            risk_value = 0.3 + (i % 4) * 0.15 + (heatmap_data[i] if i < len(heatmap_data) else 0) * 0.3
            risk_value = min(0.95, max(0.15, risk_value))
            
            if risk_value >= 0.7:
                risk_level = "重大风险"
            elif risk_value >= 0.5:
                risk_level = "较大风险"
            elif risk_value >= 0.3:
                risk_level = "一般风险"
            else:
                risk_level = "低风险"
            
            cells.append({
                "x": positions[i][0],
                "y": positions[i][1],
                "risk_value": risk_value,
                "risk_level": risk_level,
                "region_name": region_name
            })
        
        return {"success": True, "cells": cells}
    
    cells = []
    regions = ["1213采掘工作面", "东翼回风巷", "中部采掘区", "西翼运输巷", "主斜井", "回风联络巷", "运输巷", "辅助巷道"]
    positions = [(15, 20), (35, 25), (55, 30), (75, 35), (25, 50), (45, 55), (65, 60), (85, 65)]
    risk_values = [0.85, 0.62, 0.45, 0.28, 0.55, 0.72, 0.35, 0.42]
    
    for i, region_name in enumerate(regions):
        risk_value = risk_values[i]
        
        if risk_value >= 0.7:
            risk_level = "重大风险"
        elif risk_value >= 0.5:
            risk_level = "较大风险"
        elif risk_value >= 0.3:
            risk_level = "一般风险"
        else:
            risk_level = "低风险"
        
        cells.append({
            "x": positions[i][0],
            "y": positions[i][1],
            "risk_value": risk_value,
            "risk_level": risk_level,
            "region_name": region_name
        })
    
    return {"success": True, "cells": cells}

if __name__ == '__main__':
    import uvicorn
    
    scheduler.add_job(scheduled_predict, 'interval', seconds=30, id='scheduled_predict', max_instances=1)
    scheduler.start()
    is_auto_running = True
    logger.info("定时推理已自动启动，间隔: 30秒")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
