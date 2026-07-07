import { dashboardSnapshotSchema } from "@/schemas/businessSchemas";
import type { DashboardSnapshot } from "@/types/business";
import type { MetricCardModel } from "@/types/navigation";
import { mockUpdatedAt } from "./mockConstants";

export const mockPlatformSummary = {
  mineName: "红岩示范矿井",
  regionName: "东翼采掘区",
  updatedAt: mockUpdatedAt,
  dataState: "演示 mock 数据",
};

export const dashboardMetrics: MetricCardModel[] = [
  { label: "当前综合风险", value: "一般", hint: "基于演示数据的态势占位", trend: "较昨日下降 2%", risk: "normal" },
  { label: "实时预警", value: "6", hint: "待核查事件数", trend: "2 条较大风险", risk: "high" },
  { label: "重大隐患", value: "3", hint: "八步闭环治理中", trend: "1 条临近验收", risk: "critical" },
  { label: "双控闭环率", value: "86%", hint: "mock 台账统计", trend: "本周 +4%", risk: "low" },
];

export const hazardWorkflowSteps = ["整理", "分析", "通报", "整改", "反馈", "验收", "审查", "销号"];

export const dashboardProductionAreas = [
  { id: "AREA-MAIN", label: "主斜井", role: "入风与人员通行", status: "通风稳定", riskLevel: "low", x: 16, y: 56 },
  { id: "AREA-TRANS", label: "西翼运输巷", role: "运输与巡检", status: "常规巡检", riskLevel: "low", x: 25, y: 72 },
  { id: "AREA-RETURN", label: "东翼回风巷", role: "回风与瓦斯复核", status: "重点关注", riskLevel: "high", x: 67, y: 36 },
  { id: "AREA-FACE", label: "1213采掘工作面", role: "采掘作业", status: "处置中", riskLevel: "critical", x: 49, y: 48 },
  { id: "AREA-MID", label: "中部采掘区", role: "双控闭环推进", status: "整改反馈", riskLevel: "normal", x: 55, y: 70 },
  { id: "AREA-WIND", label: "回风联络巷", role: "通风调节", status: "风速偏低", riskLevel: "normal", x: 79, y: 58 },
] as const;

export const dashboardProductionPoints = [
  { id: "P-CH4-03", code: "CH4-03", label: "瓦斯浓度", pointType: "CH4", regionName: "1213采掘工作面", tunnelName: "采掘工作面", value: 1.25, threshold: 1.0, unit: "%", riskLevel: "high", status: "超限复核", owner: "监测一组", updatedAt: mockUpdatedAt, x: 48, y: 44 },
  { id: "P-G07", code: "G07", label: "瓦斯变化率", pointType: "CH4趋势", regionName: "东翼回风巷", tunnelName: "东翼回风巷", value: 0.18, threshold: 0.12, unit: "%/min", riskLevel: "normal", status: "待确认", owner: "通风区", updatedAt: mockUpdatedAt, x: 66, y: 38 },
  { id: "P-WIND-02", code: "WIND-02", label: "回风风速", pointType: "风速", regionName: "回风联络巷", tunnelName: "回风巷", value: 0.72, threshold: 0.8, unit: "m/s", riskLevel: "normal", status: "低于阈值", owner: "通风区", updatedAt: mockUpdatedAt, x: 78, y: 58 },
  { id: "P-PRESS-01", code: "PRESS-01", label: "负压", pointType: "负压", regionName: "主斜井", tunnelName: "主斜井", value: 3.2, threshold: 3.8, unit: "kPa", riskLevel: "low", status: "稳定", owner: "监测二组", updatedAt: mockUpdatedAt, x: 18, y: 55 },
  { id: "P-DUST-01", code: "DUST-01", label: "粉尘浓度", pointType: "粉尘", regionName: "中部采掘区", tunnelName: "运输巷", value: 35, threshold: 30, unit: "mg/m³", riskLevel: "high", status: "处置中", owner: "安全科", updatedAt: mockUpdatedAt, x: 57, y: 69 },
] as const;

export const dashboardVentilationFlows = [
  { id: "FLOW-01", label: "入风", from: "主斜井", to: "中部采掘区", volume: "1,860 m³/min", status: "稳定", x1: 16, y1: 57, x2: 48, y2: 47 },
  { id: "FLOW-02", label: "回风", from: "1213采掘工作面", to: "东翼回风巷", volume: "1,420 m³/min", status: "偏低关注", x1: 51, y1: 48, x2: 72, y2: 36 },
  { id: "FLOW-03", label: "联络风流", from: "中部采掘区", to: "回风联络巷", volume: "980 m³/min", status: "复核中", x1: 57, y1: 69, x2: 79, y2: 58 },
] as const;

export const dashboardLatestAlerts = [
  { id: "ALERT-001", area: "1213采掘工作面", point: "CH4-03", currentValue: 1.25, threshold: 1.0, unit: "%", riskLevel: "high", status: "监测一组复核中", owner: "监测一组", updatedAt: "2026-06-27 12:31:15", href: "/warning/events" },
  { id: "ALERT-002", area: "回风联络巷", point: "WIND-02", currentValue: 0.72, threshold: 0.8, unit: "m/s", riskLevel: "normal", status: "通风区处置中", owner: "通风区", updatedAt: "2026-06-27 12:20:41", href: "/monitoring/realtime" },
  { id: "ALERT-003", area: "中部采掘区", point: "DUST-01", currentValue: 35, threshold: 30, unit: "mg/m³", riskLevel: "high", status: "安全科待验收", owner: "安全科", updatedAt: "2026-06-27 12:05:33", href: "/double-prevention/hazard-governance" },
] as const;

export const mockDashboard = dashboardSnapshotSchema.parse({
  metrics: dashboardMetrics,
  regionRanking: [
    { regionId: "R-EAST", regionName: "东翼回风巷", riskLevel: "high", hazardCount: 4, warningCount: 3, updatedAt: mockUpdatedAt, controlStatus: "重点跟踪" },
    { regionId: "R-MID", regionName: "中部采掘区", riskLevel: "normal", hazardCount: 3, warningCount: 2, updatedAt: mockUpdatedAt, controlStatus: "闭环推进" },
    { regionId: "R-WEST", regionName: "西翼运输巷", riskLevel: "low", hazardCount: 1, warningCount: 1, updatedAt: mockUpdatedAt, controlStatus: "常规巡检" },
  ],
  trendPlaceholders: [
    { label: "近期预警趋势", value: "7 日序列", hint: "使用 mock 趋势图表达" },
    { label: "区域风险排行", value: "按风险等级与待办排序", hint: "当前为 mock 排名" },
  ],
  todoTasks: [
    { id: "TODO-01", title: "复核东翼回风巷瓦斯波动", owner: "监测一组", dueAt: "2026-06-27 11:00", status: "verifying", riskLevel: "high" },
    { id: "TODO-02", title: "提交中部采掘区整改反馈", owner: "安全科", dueAt: "2026-06-28 09:00", status: "handling", riskLevel: "normal" },
    { id: "TODO-03", title: "复查西翼运输巷风险告知卡", owner: "双控专员", dueAt: "2026-06-29 16:00", status: "reviewing", riskLevel: "low" },
  ],
  productionAreas: dashboardProductionAreas,
  productionPoints: dashboardProductionPoints,
  ventilationFlows: dashboardVentilationFlows,
  latestAlerts: dashboardLatestAlerts,
  updatedAt: mockUpdatedAt,
}) as DashboardSnapshot;
