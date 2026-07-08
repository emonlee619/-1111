"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Save, RotateCcw, AlertTriangle } from "lucide-react";

export interface StaticMineData {
  sample_id: string;
  mine_type: string;
  gas_pressure_MPa: number;
  coal_firmness_f: number;
  gas_diffusion_mmHg: number;
  burial_depth_m: number;
  geological_structure: string;
  fault_distance_m: number;
  structure_distance_m: number;
  D_value: number;
  K_value: number;
  coal_thickness_m: number;
  coal_dip_deg: number;
  spontaneous_combustion: string;
  ventilation_rationality: string;
  gas_extraction_effect: number;
  gas_extraction_continuity: number;
  prevention_score: number;
  wind_speed_alarm_count: number;
  local_fan_power_alarm_count: number;
  gas_lock_fail_count: number;
  gas_sensor_overtime_min: number;
  gas_sensor_overcount: number;
  power_off_fail_count: number;
  inspector_missing_count: number;
  violation_count: number;
  safety_training_rate: number;
  certification_rate: number;
  safety_cost_per_ton: number;
  gas_level: string;
  fire_source_management: number;
  fire_prevention_design: number;
  support_material_combustible: number;
  coal_dust_explosion_index: number;
  gas_explosion_hazard_count: number;
  accident_history: number;
  accident_severity: number;
  fuzzy_score: number;
  risk_level: string;
  red_line_triggered: number;
}

const STATIC_DATA_FIELDS: { key: keyof StaticMineData; label: string; unit?: string; type: "number" | "string" }[] = [
  { key: "mine_type", label: "矿井类型", type: "string" },
  { key: "gas_pressure_MPa", label: "煤层瓦斯压力", unit: "MPa", type: "number" },
  { key: "coal_firmness_f", label: "煤坚固性系数", type: "number" },
  { key: "gas_diffusion_mmHg", label: "瓦斯放散初速度", unit: "mmHg", type: "number" },
  { key: "burial_depth_m", label: "煤层埋藏深度", unit: "m", type: "number" },
  { key: "geological_structure", label: "地质构造类型", type: "string" },
  { key: "fault_distance_m", label: "断层距工作面距离", unit: "m", type: "number" },
  { key: "structure_distance_m", label: "工作面与构造带距离", unit: "m", type: "number" },
  { key: "D_value", label: "D值", type: "number" },
  { key: "K_value", label: "K值", type: "number" },
  { key: "coal_thickness_m", label: "煤层厚度", unit: "m", type: "number" },
  { key: "coal_dip_deg", label: "煤层倾角", unit: "°", type: "number" },
  { key: "spontaneous_combustion", label: "煤层自燃倾向性", type: "string" },
  { key: "ventilation_rationality", label: "主通风系统合理性", type: "string" },
  { key: "gas_extraction_effect", label: "瓦斯抽采效果达标", type: "number" },
  { key: "gas_extraction_continuity", label: "瓦斯抽采接续合理", type: "number" },
  { key: "prevention_score", label: "综合防治措施总分", type: "number" },
  { key: "wind_speed_alarm_count", label: "风速异常报警次数", type: "number" },
  { key: "local_fan_power_alarm_count", label: "局部通风机馈电异常次数", type: "number" },
  { key: "gas_lock_fail_count", label: "甲烷电风电闭锁失效次数", type: "number" },
  { key: "gas_sensor_overtime_min", label: "瓦斯传感器超限时长", unit: "min", type: "number" },
  { key: "gas_sensor_overcount", label: "瓦斯传感器超限次数", type: "number" },
  { key: "power_off_fail_count", label: "应断未断电次数", type: "number" },
  { key: "inspector_missing_count", label: "瓦检员空班漏检假检次数", type: "number" },
  { key: "violation_count", label: "通风瓦斯三违数量", type: "number" },
  { key: "safety_training_rate", label: "安全培训率", type: "number" },
  { key: "certification_rate", label: "持证上岗率", type: "number" },
  { key: "safety_cost_per_ton", label: "吨煤安全费用", unit: "元", type: "number" },
  { key: "gas_level", label: "矿井瓦斯等级", type: "string" },
  { key: "fire_source_management", label: "火源管理合规", type: "number" },
  { key: "fire_prevention_design", label: "有防灭火设计", type: "number" },
  { key: "support_material_combustible", label: "支护材料可燃", type: "number" },
  { key: "coal_dust_explosion_index", label: "煤尘爆炸指数", type: "number" },
  { key: "gas_explosion_hazard_count", label: "瓦斯爆炸隐患数量", type: "number" },
  { key: "accident_history", label: "有事故历史", type: "number" },
  { key: "accident_severity", label: "事故严重程度", type: "number" },
  { key: "fuzzy_score", label: "模糊综合评分", type: "number" },
  { key: "risk_level", label: "风险等级", type: "string" },
  { key: "red_line_triggered", label: "红线熔断", type: "number" },
];

const MOCK_STATIC_DATA: StaticMineData = {
  sample_id: "M001",
  mine_type: "突出矿井(防突有效)",
  gas_pressure_MPa: 1.167,
  coal_firmness_f: 0.332,
  gas_diffusion_mmHg: 15.1,
  burial_depth_m: 600.9,
  geological_structure: "复杂构造",
  fault_distance_m: 148.6,
  structure_distance_m: 90.3,
  D_value: 4.508,
  K_value: 45.5,
  coal_thickness_m: 2.6,
  coal_dip_deg: 21.8,
  spontaneous_combustion: "不易自燃",
  ventilation_rationality: "不合理",
  gas_extraction_effect: 1,
  gas_extraction_continuity: 1,
  prevention_score: 65,
  wind_speed_alarm_count: 1,
  local_fan_power_alarm_count: 0,
  gas_lock_fail_count: 0,
  gas_sensor_overtime_min: 29.4,
  gas_sensor_overcount: 4,
  power_off_fail_count: 0,
  inspector_missing_count: 0,
  violation_count: 0,
  safety_training_rate: 0.689,
  certification_rate: 0.731,
  safety_cost_per_ton: 32.9,
  gas_level: "高瓦斯",
  fire_source_management: 0,
  fire_prevention_design: 1,
  support_material_combustible: 1,
  coal_dust_explosion_index: 18.0,
  gas_explosion_hazard_count: 1,
  accident_history: 0,
  accident_severity: 0,
  fuzzy_score: 0.0,
  risk_level: "危险（红线熔断）",
  red_line_triggered: 1,
};

export function StaticDataPanel() {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<StaticMineData>(MOCK_STATIC_DATA);
  const [originalData, setOriginalData] = useState<StaticMineData>(MOCK_STATIC_DATA);
  const [editingKey, setEditingKey] = useState<keyof StaticMineData | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetch("/api/outburst/static-data")
      .then(res => res.json())
      .then((result) => {
        if (result && typeof result === "object") {
          const apiData = {
            ...MOCK_STATIC_DATA,
            sample_id: String(result.mine_id ?? result.sample_id ?? "M001"),
            mine_type: String(result.mine_type ?? ""),
            gas_pressure_MPa: Number(result.煤层瓦斯压力_MPa ?? result.gas_pressure_MPa ?? MOCK_STATIC_DATA.gas_pressure_MPa),
            coal_firmness_f: Number(result.煤坚固性系数_f ?? result.coal_firmness_f ?? MOCK_STATIC_DATA.coal_firmness_f),
            gas_diffusion_mmHg: Number(result.瓦斯放散初速度_mmHg ?? result.gas_diffusion_mmHg ?? MOCK_STATIC_DATA.gas_diffusion_mmHg),
            burial_depth_m: Number(result.煤层埋藏深度_m ?? result.burial_depth_m ?? MOCK_STATIC_DATA.burial_depth_m),
            geological_structure: String(result.地质构造类型 ?? result.geological_structure ?? ""),
            fault_distance_m: Number(result.断层距工作面距离_m ?? result.fault_distance_m ?? MOCK_STATIC_DATA.fault_distance_m),
            structure_distance_m: Number(result.工作面与构造带距离_m ?? result.structure_distance_m ?? MOCK_STATIC_DATA.structure_distance_m),
            D_value: Number(result.D值 ?? result.D_value ?? MOCK_STATIC_DATA.D_value),
            K_value: Number(result.K值 ?? result.K_value ?? MOCK_STATIC_DATA.K_value),
            coal_thickness_m: Number(result.煤层厚度_m ?? result.coal_thickness_m ?? MOCK_STATIC_DATA.coal_thickness_m),
            coal_dip_deg: Number(result["煤层倾角_°"] ?? result.coal_dip_deg ?? MOCK_STATIC_DATA.coal_dip_deg),
            spontaneous_combustion: String(result.煤层自燃倾向性 ?? result.spontaneous_combustion ?? ""),
            ventilation_rationality: String(result.主通风系统合理性 ?? result.ventilation_rationality ?? ""),
            gas_extraction_effect: Number(result.瓦斯抽采效果达标 ?? result.gas_extraction_effect ?? MOCK_STATIC_DATA.gas_extraction_effect),
            gas_extraction_continuity: Number(result.瓦斯抽采接续合理 ?? result.gas_extraction_continuity ?? MOCK_STATIC_DATA.gas_extraction_continuity),
            prevention_score: Number(result.综合防治措施总分 ?? result.prevention_score ?? MOCK_STATIC_DATA.prevention_score),
            wind_speed_alarm_count: Number(result.风速异常报警次数 ?? result.wind_speed_alarm_count ?? MOCK_STATIC_DATA.wind_speed_alarm_count),
            local_fan_power_alarm_count: Number(result.局部通风机馈电异常次数 ?? result.local_fan_power_alarm_count ?? MOCK_STATIC_DATA.local_fan_power_alarm_count),
            gas_lock_fail_count: Number(result.甲烷电风电闭锁失效次数 ?? result.gas_lock_fail_count ?? MOCK_STATIC_DATA.gas_lock_fail_count),
            gas_sensor_overtime_min: Number(result.瓦斯传感器超限时长_min ?? result.gas_sensor_overtime_min ?? MOCK_STATIC_DATA.gas_sensor_overtime_min),
            gas_sensor_overcount: Number(result.瓦斯传感器超限次数 ?? result.gas_sensor_overcount ?? MOCK_STATIC_DATA.gas_sensor_overcount),
            power_off_fail_count: Number(result.应断未断电次数 ?? result.power_off_fail_count ?? MOCK_STATIC_DATA.power_off_fail_count),
            inspector_missing_count: Number(result.瓦检员空班漏检假检次数 ?? result.inspector_missing_count ?? MOCK_STATIC_DATA.inspector_missing_count),
            violation_count: Number(result.通风瓦斯三违数量 ?? result.violation_count ?? MOCK_STATIC_DATA.violation_count),
            safety_training_rate: Number(result.安全培训率 ?? result.safety_training_rate ?? MOCK_STATIC_DATA.safety_training_rate),
            certification_rate: Number(result.持证上岗率 ?? result.certification_rate ?? MOCK_STATIC_DATA.certification_rate),
            safety_cost_per_ton: Number(result.吨煤安全费用_元 ?? result.safety_cost_per_ton ?? MOCK_STATIC_DATA.safety_cost_per_ton),
            gas_level: String(result.矿井瓦斯等级 ?? result.gas_level ?? ""),
            fire_source_management: Number(result.火源管理合规 ?? result.fire_source_management ?? MOCK_STATIC_DATA.fire_source_management),
            fire_prevention_design: Number(result.有防灭火设计 ?? result.fire_prevention_design ?? MOCK_STATIC_DATA.fire_prevention_design),
            support_material_combustible: Number(result.支护材料可燃 ?? result.support_material_combustible ?? MOCK_STATIC_DATA.support_material_combustible),
            coal_dust_explosion_index: Number(result.煤尘爆炸指数 ?? result.coal_dust_explosion_index ?? MOCK_STATIC_DATA.coal_dust_explosion_index),
            gas_explosion_hazard_count: Number(result.瓦斯爆炸隐患数量 ?? result.gas_explosion_hazard_count ?? MOCK_STATIC_DATA.gas_explosion_hazard_count),
            accident_history: Number(result.有事故历史 ?? result.accident_history ?? MOCK_STATIC_DATA.accident_history),
            accident_severity: Number(result.事故严重程度 ?? result.accident_severity ?? MOCK_STATIC_DATA.accident_severity),
            fuzzy_score: Number(result.模糊综合评分 ?? result.fuzzy_score ?? MOCK_STATIC_DATA.fuzzy_score),
            risk_level: String(result.风险等级 ?? result.risk_level ?? ""),
            red_line_triggered: Number(result.红线熔断 ?? result.red_line_triggered ?? MOCK_STATIC_DATA.red_line_triggered),
          };
          setData(apiData);
          setOriginalData(apiData);
        }
      })
      .catch(() => {
        console.log("Static data API not available, using mock data");
      });
  }, []);

  const hasChanges = useMemo(() => {
    return Object.keys(data).some((key) => {
      const k = key as keyof StaticMineData;
      return data[k] !== originalData[k];
    });
  }, [data, originalData]);

  const handleEditStart = (key: keyof StaticMineData) => {
    setEditingKey(key);
    setEditValue(String(data[key]));
  };

  const handleEditEnd = () => {
    if (editingKey !== null) {
      const field = STATIC_DATA_FIELDS.find(f => f.key === editingKey);
      if (field) {
        const newValue = field.type === "number" ? Number(editValue) : editValue;
        if (!isNaN(newValue as number)) {
          setData(prev => ({ ...prev, [editingKey]: newValue }));
        }
      }
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleSave = () => {
    fetch("/api/outburst/static-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(res => res.json())
      .then(() => {
        setOriginalData(data);
      })
      .catch(err => console.error("Save failed:", err));
  };

  const handleReset = () => {
    setData(originalData);
  };

  return (
    <div className="rounded-[6px] border border-cyan-300/20 bg-[#020b18]/76 overflow-hidden">
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-cyan-300/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
            <AlertTriangle className="h-5 w-5" />
            静态数据
          </span>
          <span className="text-sm text-muted">矿井基础参数 · 32项指标</span>
        </div>
        <div className="flex items-center gap-2 px-4">
          {hasChanges && (
            <span className="text-xs text-orange-100">已修改</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cyan-300/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-cyan-300/10">
            {STATIC_DATA_FIELDS.map((field) => (
              <div key={field.key} className="bg-[#020b18]/50 px-3 py-2">
                <div className="text-xs text-muted mb-1">{field.label}</div>
                {editingKey === field.key ? (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditEnd}
                    onKeyDown={(e) => e.key === "Enter" && handleEditEnd()}
                    className="w-full rounded-[3px] border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-sm text-ink focus:border-cyan-300/60 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div
                    className="text-sm font-medium text-ink cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleEditStart(field.key)}
                  >
                    {field.type === "number"
                      ? typeof data[field.key] === "number"
                        ? data[field.key].toLocaleString("zh-CN", { maximumFractionDigits: 4 })
                        : data[field.key]
                      : data[field.key]}
                    {field.unit && <span className="text-xs text-muted ml-1">{field.unit}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 px-4 py-3 border-t border-cyan-300/10">
            {hasChanges && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[4px] border border-cyan-300/24 bg-cyan-300/8 text-xs text-muted hover:text-ink transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重置
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[4px] border border-green-300/28 bg-green-400/12 text-xs font-medium text-green-100 hover:border-green-300/60 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  保存修改
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
