import type { RiskLevel } from "@/types/risk";

export const mockUpdatedAt = "2026-06-27 09:30";

export const riskLevelText: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般风险",
  high: "较大风险",
  critical: "重大风险",
};

export const statusText = {
  pending: "待整理",
  verifying: "待核查",
  handling: "处置中",
  reviewing: "待验收",
  closed: "已销号",
} as const;

export const workflowStatusText = {
  pending: "未开始",
  active: "进行中",
  done: "已完成",
  blocked: "受阻",
} as const;

export const versionStatusText = {
  draft: "草案",
  evaluation: "评估中",
  active: "演示启用",
  archived: "归档",
} as const;

export const realChannelNames = [
  "瓦斯浓度 CH4-01",
  "瓦斯浓度 CH4-02",
  "一氧化碳 CO-01",
  "氧气 O2-01",
  "风速 FS-01",
  "风压 FY-01",
  "负压 FP-01",
  "温度 WD-01",
  "湿度 SD-01",
  "煤体应力 YL-01",
  "钻孔压力 ZK-01",
  "微震能量 WZ-01",
  "声发射 AE-01",
  "位移 WY-01",
];

export const generatedChannelNames = [
  "瓦斯变化率前兆",
  "瓦斯梯度前兆",
  "压力累积前兆",
  "风速扰动前兆",
  "温湿耦合前兆",
  "应力突变前兆",
  "钻孔压力漂移前兆",
  "微震频次前兆",
  "声发射活跃度前兆",
  "位移加速度前兆",
  "多通道协同异常",
  "短窗波动强度",
  "长窗趋势偏移",
  "采掘扰动指数",
  "地质构造敏感度",
  "通风稳定性指数",
  "隐患邻近度",
  "历史相似片段分",
  "综合突出前兆分",
];

export const boundaryNotes = [
  "当前页面仅使用 mock 数据或静态说明，不接真实后端、数据库、模型服务、监测流或通知通道。",
  "mock 指标只用于前端信息结构验证，不代表真实矿井在线结论。",
];
