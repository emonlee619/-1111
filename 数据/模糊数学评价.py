"""
煤与瓦斯突出预警静态数据模糊数学评价系统
采用真正的模糊综合评价方法（隶属度函数 + 模糊矩阵运算）
包含国家法定突出煤层红线熔断机制
"""

import numpy as np
from typing import Dict, List, Tuple
import uuid

# 评语集：V1-安全, V2-较安全, V3-一般, V4-较危险, V5-危险
COMMENT_SET = ["安全", "较安全", "一般", "较危险", "危险"]

# 指标权重（总和=1）
weights = {
    "煤层瓦斯压力": 0.10,
    "煤坚固性系数": 0.08,
    "瓦斯放散初速度": 0.07,
    "煤层埋藏深度": 0.06,
    "地质构造": 0.05,
    "断层距工作面距离": 0.04,
    "工作面与构造带距离": 0.03,
    "突出危险性综合指标": 0.035,
    "煤层厚度": 0.02,
    "煤层倾角": 0.02,
    "煤层自燃倾向性": 0.015,
    "主通风系统合理性": 0.06,
    "瓦斯抽采效果检验": 0.05,
    "综合防治措施": 0.04,
    "风速异常报警情况": 0.03,
    "局部通风机馈电异常": 0.02,
    "甲烷电风电闭锁可靠性": 0.03,
    "瓦斯传感器超限时长": 0.03,
    "瓦斯传感器超限次数": 0.02,
    "应断未断电次数": 0.02,
    "瓦检员空班漏检假检次数": 0.03,
    "通风专业瓦斯相关三违数量": 0.02,
    "安全培训率": 0.02,
    "持证上岗率": 0.02,
    "吨煤安全费用提取": 0.01,
    "矿井瓦斯等级": 0.02,
    "火源管理": 0.01,
    "防灭火设计": 0.01,
    "巷道支护材料可燃性": 0.01,
    "煤尘爆炸指数": 0.01,
    "瓦斯爆炸类隐患数量": 0.01,
    "事故历史": 0.01
}

# 国家法定红线阈值
RED_LINE_D = 0.25   # D指标阈值
RED_LINE_K = 20     # K指标阈值


def build_membership_function(score: float) -> np.ndarray:
    """
    根据单项评分构建隶属度向量
    
    评语集：V1-安全(100-80), V2-较安全(80-60), V3-一般(60-40), V4-较危险(40-20), V5-危险(20-0)
    
    使用三角形隶属度函数，每个评分值对相邻两个评语等级有隶属度
    
    返回：隶属度向量 r = [r1, r2, r3, r4, r5]
    """
    r = np.zeros(5)
    
    if score >= 100:
        r[0] = 1.0  # 完全属于"安全"
    elif score >= 80:
        # 在"安全"和"较安全"之间
        r[0] = (score - 80) / 20
        r[1] = (100 - score) / 20
    elif score >= 60:
        # 在"较安全"和"一般"之间
        r[1] = (score - 60) / 20
        r[2] = (80 - score) / 20
    elif score >= 40:
        # 在"一般"和"较危险"之间
        r[2] = (score - 40) / 20
        r[3] = (60 - score) / 20
    elif score >= 20:
        # 在"较危险"和"危险"之间
        r[3] = (score - 20) / 20
        r[4] = (40 - score) / 20
    else:
        r[4] = 1.0  # 完全属于"危险"
    
    return r


def score_to_membership(score: float) -> np.ndarray:
    """
    将评分转换为隶属度向量（简化版：直接映射）
    
    评分区间对应评语等级：
    - [90, 100] -> V1 安全
    - [70, 90)  -> V2 较安全
    - [50, 70)  -> V3 一般
    - [30, 50)  -> V4 较危险
    - [0, 30)   -> V5 危险
    """
    if score >= 90:
        return np.array([1.0, 0.0, 0.0, 0.0, 0.0])
    elif score >= 70:
        return np.array([0.0, 1.0, 0.0, 0.0, 0.0])
    elif score >= 50:
        return np.array([0.0, 0.0, 1.0, 0.0, 0.0])
    elif score >= 30:
        return np.array([0.0, 0.0, 0.0, 1.0, 0.0])
    else:
        return np.array([0.0, 0.0, 0.0, 0.0, 1.0])


# ============== 各指标评分函数 ==============

def score_coal_gas_pressure(p: float) -> Tuple[float, np.ndarray]:
    """煤层瓦斯压力 P（MPa）评分及隶属度"""
    if p < 0.74:
        score = 100
    elif p < 1.0:
        score = 60
    elif p < 1.5:
        score = 30
    else:
        score = 10
    return score, build_membership_function(score)


def score_coal_firmness(f: float) -> Tuple[float, np.ndarray]:
    """煤坚固性系数 f 评分及隶属度"""
    if f > 0.8:
        score = 100
    elif f > 0.5:
        score = 70
    elif f > 0.3:
        score = 40
    else:
        score = 10
    return score, build_membership_function(score)


def score_gas_diffusion_velocity(dp: float) -> Tuple[float, np.ndarray]:
    """瓦斯放散初速度 Δp（mmHg）评分及隶属度"""
    if dp < 10:
        score = 100
    elif dp < 15:
        score = 60
    elif dp < 20:
        score = 30
    else:
        score = 10
    return score, build_membership_function(score)


def score_burial_depth(h: float) -> Tuple[float, np.ndarray]:
    """煤层埋藏深度 H（m）评分及隶属度"""
    if h < 400:
        score = 100
    elif h < 600:
        score = 70
    elif h < 800:
        score = 40
    else:
        score = 20
    return score, build_membership_function(score)


def score_geological_structure(structure: int) -> Tuple[float, np.ndarray]:
    """地质构造评分及隶属度"""
    scores = {0: 100, 1: 70, 2: 40, 3: 10}
    score = scores.get(structure, 0)
    return score, build_membership_function(score)


def score_fault_distance(d: float) -> Tuple[float, np.ndarray]:
    """断层距工作面距离（m）评分及隶属度"""
    if d > 200:
        score = 100
    elif d >= 100:
        score = 70
    elif d >= 50:
        score = 40
    else:
        score = 10
    return score, build_membership_function(score)


def score_structure_distance(d: float) -> Tuple[float, np.ndarray]:
    """工作面与构造带距离（m）评分及隶属度"""
    if d > 200:
        score = 100
    elif d >= 150:
        score = 80
    elif d >= 100:
        score = 60
    elif d >= 50:
        score = 30
    else:
        score = 10
    return score, build_membership_function(score)


def score_danger_indicator(d: float, k: float) -> Tuple[float, np.ndarray, bool]:
    """
    突出危险性综合指标 D/K 评分及隶属度
    
    【国家法定红线熔断机制】
    根据《防治煤与瓦斯突出细则》：
    - D ≥ 0.25 或 K ≥ 20 即判定为突出煤层
    
    返回：(评分, 隶属度向量, 是否触发红线熔断)
    """
    # 红线熔断检查
    is_red_line_triggered = (d >= RED_LINE_D) or (k >= RED_LINE_K)
    
    if is_red_line_triggered:
        # 触发红线，强制判定为危险等级
        score = 0  # 强制危险
        membership = np.array([0.0, 0.0, 0.0, 0.0, 1.0])  # 完全属于"危险"
    else:
        score = 100  # 非突出煤层
        membership = np.array([1.0, 0.0, 0.0, 0.0, 0.0])  # 完全属于"安全"
    
    return score, membership, is_red_line_triggered


def score_coal_thickness(t: float) -> Tuple[float, np.ndarray]:
    """煤层厚度（m）评分及隶属度"""
    if 1 <= t <= 2:
        score = 100
    elif 2 < t <= 4:
        score = 70
    elif 4 < t <= 6:
        score = 40
    else:
        score = 20
    return score, build_membership_function(score)


def score_dip_angle(angle: float) -> Tuple[float, np.ndarray]:
    """煤层倾角（°）评分及隶属度"""
    if 0 <= angle <= 25:
        score = 100
    elif angle <= 45:
        score = 70
    elif angle <= 60:
        score = 40
    else:
        score = 20
    return score, build_membership_function(score)


def score_spontaneous_combustion(tendency: int) -> Tuple[float, np.ndarray]:
    """煤层自燃倾向性评分及隶属度"""
    scores = {0: 100, 1: 60, 2: 30}
    score = scores.get(tendency, 0)
    return score, build_membership_function(score)


def score_ventilation_system(system_type: int) -> Tuple[float, np.ndarray]:
    """主通风系统合理性评分及隶属度"""
    scores = {0: 100, 1: 70, 2: 50, 3: 10}
    score = scores.get(system_type, 0)
    return score, build_membership_function(score)


def score_gas_extraction(qualified: bool, continuity: bool) -> Tuple[float, np.ndarray]:
    """瓦斯抽采效果检验评分及隶属度"""
    if qualified and continuity:
        score = 100
    elif qualified:
        score = 60
    else:
        score = 20
    return score, build_membership_function(score)


def score_prevention_measures(scores_dict: Dict) -> Tuple[float, np.ndarray]:
    """综合防治措施评分及隶属度"""
    items = {
        "通风系统合理性": 10,
        "测风制度执行": 15,
        "通风设施质量": 15,
        "局部通风机管理": 10,
        "巷道维修": 10,
        "闲散巷道管理": 10,
        "瓦斯检查制度": 10,
        "安全监控系统": 20
    }
    total = sum(scores_dict.get(k, 0) for k in items.keys())
    return total, build_membership_function(total)


def score_wind_speed_alarm(count: int) -> Tuple[float, np.ndarray]:
    """风速异常报警情况评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 80
    else:
        score = 0
    return score, build_membership_function(score)


def score_fan_feeder_abnormal(count: int) -> Tuple[float, np.ndarray]:
    """局部通风机馈电异常评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 70
    else:
        score = 0
    return score, build_membership_function(score)


def score_power_cutoff_reliability(count: int) -> Tuple[float, np.ndarray]:
    """甲烷电、风电闭锁可靠性评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 60
    else:
        score = 0
    return score, build_membership_function(score)


def score_gas_sensor_duration(minutes: float) -> Tuple[float, np.ndarray]:
    """瓦斯传感器超限时长评分及隶属度"""
    if minutes < 1:
        score = 100
    elif minutes < 30:
        score = 50
    elif minutes < 60:
        score = 20
    else:
        score = 0
    return score, build_membership_function(score)


def score_gas_sensor_overrun(count: int) -> Tuple[float, np.ndarray]:
    """瓦斯传感器超限次数评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 50
    else:
        score = 0
    return score, build_membership_function(score)


def score_power_cutoff_miss(count: int) -> Tuple[float, np.ndarray]:
    """应断未断电次数评分及隶属度"""
    score = 100 if count == 0 else 0
    return score, build_membership_function(score)


def score_gas_inspector_violation(count: int) -> Tuple[float, np.ndarray]:
    """瓦检员空班漏检、假检次数评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 40
    else:
        score = 0
    return score, build_membership_function(score)


def score_ventilation_violation(count: int) -> Tuple[float, np.ndarray]:
    """通风专业与瓦斯相关三违数量评分及隶属度"""
    if count == 0:
        score = 100
    elif count == 1:
        score = 50
    else:
        score = 0
    return score, build_membership_function(score)


def score_training_rate(rate: float) -> Tuple[float, np.ndarray]:
    """安全培训率评分及隶属度"""
    score = rate * 100
    return score, build_membership_function(score)


def score_certificate_rate(rate: float) -> Tuple[float, np.ndarray]:
    """持证上岗率评分及隶属度"""
    score = rate * 100
    return score, build_membership_function(score)


def score_safety_cost(cost: float) -> Tuple[float, np.ndarray]:
    """吨煤安全费用提取评分及隶属度"""
    score = 100 if cost >= 30 else 50
    return score, build_membership_function(score)


def score_gas_level(level: int) -> Tuple[float, np.ndarray]:
    """矿井瓦斯等级评分及隶属度"""
    scores = {0: 100, 1: 60, 2: 30, 3: 10}
    score = scores.get(level, 0)
    return score, build_membership_function(score)


def score_ignition_management(compliant: bool) -> Tuple[float, np.ndarray]:
    """火源管理评分及隶属度"""
    score = 100 if compliant else 40
    return score, build_membership_function(score)


def score_fire_prevention_design(has_design: bool) -> Tuple[float, np.ndarray]:
    """防灭火设计评分及隶属度"""
    score = 100 if has_design else 30
    return score, build_membership_function(score)


def score_support_material(flammable: bool) -> Tuple[float, np.ndarray]:
    """巷道支护材料可燃性评分及隶属度"""
    score = 30 if flammable else 100
    return score, build_membership_function(score)


def score_dust_explosion_index(index: float) -> Tuple[float, np.ndarray]:
    """煤尘爆炸指数评分及隶属度"""
    if index < 10:
        score = 100
    elif index < 15:
        score = 60
    elif index < 28:
        score = 30
    else:
        score = 10
    return score, build_membership_function(score)


def score_gas_explosion_hazard(count: int) -> Tuple[float, np.ndarray]:
    """瓦斯爆炸类隐患数量评分及隶属度"""
    score = max(0, 100 - count * 20)
    return score, build_membership_function(score)


def score_accident_history(has_accident: bool, severity: int) -> Tuple[float, np.ndarray]:
    """事故历史评分及隶属度"""
    if not has_accident:
        score = 100
    elif severity == 1:
        score = 50
    else:
        score = 0
    return score, build_membership_function(score)


def fuzzy_comprehensive_evaluation(data: Dict) -> Dict:
    """
    模糊综合评价（真正的模糊数学方法）
    
    步骤：
    1. 计算各指标的隶属度向量，构建模糊关系矩阵 R
    2. 使用权重向量 A 进行模糊合成运算：B = A × R
    3. 根据最大隶属度原则判定最终风险等级
    
    参数：
        data: 各指标实测值字典
    
    返回：
        评价结果字典
    """
    # 检查红线熔断
    red_line_triggered = False
    red_line_reason = ""
    
    if "突出危险性综合指标D" in data and "突出危险性综合指标K" in data:
        d_val = data["突出危险性综合指标D"]
        k_val = data["突出危险性综合指标K"]
        if d_val >= RED_LINE_D:
            red_line_triggered = True
            red_line_reason = f"D={d_val}≥{RED_LINE_D}（法定红线）"
        elif k_val >= RED_LINE_K:
            red_line_triggered = True
            red_line_reason = f"K={k_val}≥{RED_LINE_K}（法定红线）"
    
    # 收集各指标的评分和隶属度
    scores_dict = {}
    membership_dict = {}
    
    # 逐个计算指标评分和隶属度
    if "煤层瓦斯压力" in data:
        s, m = score_coal_gas_pressure(data["煤层瓦斯压力"])
        scores_dict["煤层瓦斯压力"] = s
        membership_dict["煤层瓦斯压力"] = m
    
    if "煤坚固性系数" in data:
        s, m = score_coal_firmness(data["煤坚固性系数"])
        scores_dict["煤坚固性系数"] = s
        membership_dict["煤坚固性系数"] = m
    
    if "瓦斯放散初速度" in data:
        s, m = score_gas_diffusion_velocity(data["瓦斯放散初速度"])
        scores_dict["瓦斯放散初速度"] = s
        membership_dict["瓦斯放散初速度"] = m
    
    if "煤层埋藏深度" in data:
        s, m = score_burial_depth(data["煤层埋藏深度"])
        scores_dict["煤层埋藏深度"] = s
        membership_dict["煤层埋藏深度"] = m
    
    if "地质构造" in data:
        s, m = score_geological_structure(data["地质构造"])
        scores_dict["地质构造"] = s
        membership_dict["地质构造"] = m
    
    if "断层距工作面距离" in data:
        s, m = score_fault_distance(data["断层距工作面距离"])
        scores_dict["断层距工作面距离"] = s
        membership_dict["断层距工作面距离"] = m
    
    if "工作面与构造带距离" in data:
        s, m = score_structure_distance(data["工作面与构造带距离"])
        scores_dict["工作面与构造带距离"] = s
        membership_dict["工作面与构造带距离"] = m
    
    if "突出危险性综合指标D" in data and "突出危险性综合指标K" in data:
        s, m, triggered = score_danger_indicator(
            data["突出危险性综合指标D"], 
            data["突出危险性综合指标K"]
        )
        scores_dict["突出危险性综合指标"] = s
        membership_dict["突出危险性综合指标"] = m
    
    if "煤层厚度" in data:
        s, m = score_coal_thickness(data["煤层厚度"])
        scores_dict["煤层厚度"] = s
        membership_dict["煤层厚度"] = m
    
    if "煤层倾角" in data:
        s, m = score_dip_angle(data["煤层倾角"])
        scores_dict["煤层倾角"] = s
        membership_dict["煤层倾角"] = m
    
    if "煤层自燃倾向性" in data:
        s, m = score_spontaneous_combustion(data["煤层自燃倾向性"])
        scores_dict["煤层自燃倾向性"] = s
        membership_dict["煤层自燃倾向性"] = m
    
    if "主通风系统合理性" in data:
        s, m = score_ventilation_system(data["主通风系统合理性"])
        scores_dict["主通风系统合理性"] = s
        membership_dict["主通风系统合理性"] = m
    
    if "瓦斯抽采效果检验达标" in data:
        qualified = data["瓦斯抽采效果检验达标"]
        continuity = data.get("瓦斯抽采效果接续合理", True)
        s, m = score_gas_extraction(qualified, continuity)
        scores_dict["瓦斯抽采效果检验"] = s
        membership_dict["瓦斯抽采效果检验"] = m
    
    if "综合防治措施" in data:
        s, m = score_prevention_measures(data["综合防治措施"])
        scores_dict["综合防治措施"] = s
        membership_dict["综合防治措施"] = m
    
    if "风速异常报警次数" in data:
        s, m = score_wind_speed_alarm(data["风速异常报警次数"])
        scores_dict["风速异常报警情况"] = s
        membership_dict["风速异常报警情况"] = m
    
    if "局部通风机馈电异常次数" in data:
        s, m = score_fan_feeder_abnormal(data["局部通风机馈电异常次数"])
        scores_dict["局部通风机馈电异常"] = s
        membership_dict["局部通风机馈电异常"] = m
    
    if "甲烷电风电闭锁失效次数" in data:
        s, m = score_power_cutoff_reliability(data["甲烷电风电闭锁失效次数"])
        scores_dict["甲烷电风电闭锁可靠性"] = s
        membership_dict["甲烷电风电闭锁可靠性"] = m
    
    if "瓦斯传感器超限时长" in data:
        s, m = score_gas_sensor_duration(data["瓦斯传感器超限时长"])
        scores_dict["瓦斯传感器超限时长"] = s
        membership_dict["瓦斯传感器超限时长"] = m
    
    if "瓦斯传感器超限次数" in data:
        s, m = score_gas_sensor_overrun(data["瓦斯传感器超限次数"])
        scores_dict["瓦斯传感器超限次数"] = s
        membership_dict["瓦斯传感器超限次数"] = m
    
    if "应断未断电次数" in data:
        s, m = score_power_cutoff_miss(data["应断未断电次数"])
        scores_dict["应断未断电次数"] = s
        membership_dict["应断未断电次数"] = m
    
    if "瓦检员空班漏检假检次数" in data:
        s, m = score_gas_inspector_violation(data["瓦检员空班漏检假检次数"])
        scores_dict["瓦检员空班漏检假检次数"] = s
        membership_dict["瓦检员空班漏检假检次数"] = m
    
    if "通风专业瓦斯相关三违数量" in data:
        s, m = score_ventilation_violation(data["通风专业瓦斯相关三违数量"])
        scores_dict["通风专业瓦斯相关三违数量"] = s
        membership_dict["通风专业瓦斯相关三违数量"] = m
    
    if "安全培训率" in data:
        s, m = score_training_rate(data["安全培训率"])
        scores_dict["安全培训率"] = s
        membership_dict["安全培训率"] = m
    
    if "持证上岗率" in data:
        s, m = score_certificate_rate(data["持证上岗率"])
        scores_dict["持证上岗率"] = s
        membership_dict["持证上岗率"] = m
    
    if "吨煤安全费用提取" in data:
        s, m = score_safety_cost(data["吨煤安全费用提取"])
        scores_dict["吨煤安全费用提取"] = s
        membership_dict["吨煤安全费用提取"] = m
    
    if "矿井瓦斯等级" in data:
        s, m = score_gas_level(data["矿井瓦斯等级"])
        scores_dict["矿井瓦斯等级"] = s
        membership_dict["矿井瓦斯等级"] = m
    
    if "火源管理合规" in data:
        s, m = score_ignition_management(data["火源管理合规"])
        scores_dict["火源管理"] = s
        membership_dict["火源管理"] = m
    
    if "有防灭火设计" in data:
        s, m = score_fire_prevention_design(data["有防灭火设计"])
        scores_dict["防灭火设计"] = s
        membership_dict["防灭火设计"] = m
    
    if "支护材料可燃" in data:
        s, m = score_support_material(data["支护材料可燃"])
        scores_dict["巷道支护材料可燃性"] = s
        membership_dict["巷道支护材料可燃性"] = m
    
    if "煤尘爆炸指数" in data:
        s, m = score_dust_explosion_index(data["煤尘爆炸指数"])
        scores_dict["煤尘爆炸指数"] = s
        membership_dict["煤尘爆炸指数"] = m
    
    if "瓦斯爆炸类隐患数量" in data:
        s, m = score_gas_explosion_hazard(data["瓦斯爆炸类隐患数量"])
        scores_dict["瓦斯爆炸类隐患数量"] = s
        membership_dict["瓦斯爆炸类隐患数量"] = m
    
    if "事故历史" in data:
        accident_data = data["事故历史"]
        s, m = score_accident_history(accident_data[0], accident_data[1])
        scores_dict["事故历史"] = s
        membership_dict["事故历史"] = m
    
    # 构建权重向量 A 和模糊关系矩阵 R
    indicators = list(scores_dict.keys())
    n = len(indicators)
    
    # 权重向量 A (归一化)
    total_weight = sum(weights.get(ind, 0) for ind in indicators)
    A = np.array([weights.get(ind, 0) / total_weight for ind in indicators])
    
    # 模糊关系矩阵 R (每列是一个指标的隶属度向量)
    R = np.array([membership_dict[ind] for ind in indicators]).T  # shape: (5, n)
    
    # 模糊合成运算 B = A × R（使用加权平均模型 M(·,+)）
    # B_j = Σ(A_i × R_ij)
    B = np.dot(A, R.T)  # shape: (5,)
    
    # 归一化 B
    B_normalized = B / np.sum(B)
    
    # 最大隶属度原则确定风险等级
    max_membership_idx = np.argmax(B_normalized)
    risk_level_by_membership = COMMENT_SET[max_membership_idx]
    
    # 计算加权平均评分（作为参考）
    weighted_score = sum(scores_dict[ind] * weights.get(ind, 0) for ind in indicators) / total_weight
    
    # 最终风险等级判定（考虑红线熔断）
    if red_line_triggered:
        final_risk_level = "危险（红线熔断）"
        final_score = 0  # 红线触发时强制为危险
    else:
        final_risk_level = risk_level_by_membership
        final_score = weighted_score
    
    return {
        "综合评分": round(final_score, 2),
        "风险等级": final_risk_level,
        "红线触发": red_line_triggered,
        "红线原因": red_line_reason if red_line_triggered else "",
        "模糊向量B": [round(x, 4) for x in B_normalized],
        "最大隶属度等级": risk_level_by_membership,
        "最大隶属度值": round(B_normalized[max_membership_idx], 4),
        "各项评分": scores_dict,
        "各项隶属度": {k: [round(x, 4) for x in v] for k, v in membership_dict.items()},
        "评价指标数": n,
        "权重向量A": [round(x, 4) for x in A]
    }


def get_risk_level(score: float) -> str:
    """根据综合评分获取风险等级（加权平均法辅助）"""
    if score >= 80:
        return "安全"
    elif score >= 60:
        return "较安全"
    elif score >= 40:
        return "一般"
    elif score >= 20:
        return "较危险"
    else:
        return "危险"


def format_result(result: Dict) -> str:
    """格式化输出评价结果"""
    output = []
    output.append("=" * 70)
    output.append("煤与瓦斯突出预警静态数据模糊综合评价结果")
    output.append("=" * 70)
    
    # 红线熔断警告
    if result["红线触发"]:
        output.append("\n【*** 国家法定红线熔断警告 ***】")
        output.append(f"原因：{result['红线原因']}")
        output.append("根据《防治煤与瓦斯突出细则》，该煤层判定为突出煤层，")
        output.append("静态风险指数强制设为0（危险等级）！")
        output.append("=" * 70)
    
    output.append(f"\n综合评分: {result['综合评分']}")
    output.append(f"风险等级: {result['风险等级']}")
    output.append(f"已评价指标数: {result['评价指标数']}/32")
    
    # 模糊评价向量
    output.append("\n" + "-" * 70)
    output.append("模糊综合评价向量 B = [V1, V2, V3, V4, V5]")
    output.append("-" * 70)
    B = result["模糊向量B"]
    for i, (level, value) in enumerate(zip(COMMENT_SET, B)):
        output.append(f"  {level}(V{i+1}): {value:.4f}")
    output.append(f"\n最大隶属度原则判定: {result['最大隶属度等级']} (隶属度={result['最大隶属度值']})")
    
    # 各项评分详情
    output.append("\n" + "-" * 70)
    output.append("各项评分详情:")
    output.append("-" * 70)
    for indicator, score in result['各项评分'].items():
        weight = weights.get(indicator, 0)
        membership = result['各项隶属度'][indicator]
        output.append(f"{indicator:<18} {score:>5.1f}分 (权重:{weight:.1%})  隶属度:{membership}")
    
    return "\n".join(output)


if __name__ == "__main__":
    # 测试数据1：正常情况
    sample_data_normal = {
        "煤层瓦斯压力": 0.65,          # MPa (<0.74 安全)
        "煤坚固性系数": 0.85,          # >0.8 安全
        "瓦斯放散初速度": 8,           # mmHg (<10 安全)
        "煤层埋藏深度": 350,           # m (<400 安全)
        "地质构造": 0,                 # 无构造
        "断层距工作面距离": 250,       # m (>200 安全)
        "工作面与构造带距离": 220,     # m (>200 安全)
        "突出危险性综合指标D": 0.15,   # <0.25 非突出
        "突出危险性综合指标K": 15,     # <20 非突出
        "煤层厚度": 1.5,              # m (1~2 安全)
        "煤层倾角": 20,               # 度 (0~25 安全)
        "煤层自燃倾向性": 0,           # 不易自燃
        "主通风系统合理性": 0,         # 正规通风
        "瓦斯抽采效果检验达标": True,
        "瓦斯抽采效果接续合理": True,
        "综合防治措施": {
            "通风系统合理性": 10, "测风制度执行": 15, "通风设施质量": 15,
            "局部通风机管理": 10, "巷道维修": 10, "闲散巷道管理": 10,
            "瓦斯检查制度": 10, "安全监控系统": 20
        },
        "风速异常报警次数": 0,
        "局部通风机馈电异常次数": 0,
        "甲烷电风电闭锁失效次数": 0,
        "瓦斯传感器超限时长": 0,
        "瓦斯传感器超限次数": 0,
        "应断未断电次数": 0,
        "瓦检员空班漏检假检次数": 0,
        "通风专业瓦斯相关三违数量": 0,
        "安全培训率": 1.0,
        "持证上岗率": 1.0,
        "吨煤安全费用提取": 35,
        "矿井瓦斯等级": 0,
        "火源管理合规": True,
        "有防灭火设计": True,
        "支护材料可燃": False,
        "煤尘爆炸指数": 8,
        "瓦斯爆炸类隐患数量": 0,
        "事故历史": (False, 0)
    }
    
    # 测试数据2：触发红线熔断
    sample_data_redline = {
        "煤层瓦斯压力": 1.8,          # MPa (≥1.5 危险)
        "煤坚固性系数": 0.2,          # ≤0.3 危险
        "瓦斯放散初速度": 25,         # mmHg (≥20 危险)
        "煤层埋藏深度": 850,          # m (>800 危险)
        "地质构造": 3,                # 构造复杂未探明
        "断层距工作面距离": 30,       # m (<50 危险)
        "工作面与构造带距离": 40,     # m (<50 危险)
        "突出危险性综合指标D": 0.35,  # ≥0.25 触发红线！
        "突出危险性综合指标K": 25,    # ≥20 触发红线！
        "煤层厚度": 7,               # m (>6 危险)
        "煤层倾角": 65,              # 度 (>60 危险)
        "煤层自燃倾向性": 2,          # 容易自燃
        "主通风系统合理性": 3,        # 多煤层串联
        "瓦斯抽采效果检验达标": False,
        "瓦斯抽采效果接续合理": False,
        "综合防治措施": {
            "通风系统合理性": 5, "测风制度执行": 8, "通风设施质量": 8,
            "局部通风机管理": 5, "巷道维修": 5, "闲散巷道管理": 5,
            "瓦斯检查制度": 5, "安全监控系统": 10
        },
        "风速异常报警次数": 3,
        "局部通风机馈电异常次数": 2,
        "甲烷电风电闭锁失效次数": 2,
        "瓦斯传感器超限时长": 90,
        "瓦斯传感器超限次数": 3,
        "应断未断电次数": 1,
        "瓦检员空班漏检假检次数": 2,
        "通风专业瓦斯相关三违数量": 3,
        "安全培训率": 0.6,
        "持证上岗率": 0.5,
        "吨煤安全费用提取": 20,
        "矿井瓦斯等级": 3,
        "火源管理合规": False,
        "有防灭火设计": False,
        "支护材料可燃": True,
        "煤尘爆炸指数": 30,
        "瓦斯爆炸类隐患数量": 5,
        "事故历史": (True, 2)
    }
    
    print("\n" + "=" * 70)
    print("测试案例1：正常低风险煤矿")
    print("=" * 70)
    result1 = fuzzy_comprehensive_evaluation(sample_data_normal)
    print(format_result(result1))
    
    print("\n" + "=" * 70)
    print("测试案例2：触发国家法定红线（D≥0.25 或 K≥20）")
    print("=" * 70)
    result2 = fuzzy_comprehensive_evaluation(sample_data_redline)
    print(format_result(result2))