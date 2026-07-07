export type RiskLevel = "low" | "normal" | "high" | "critical";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export const riskLevelLabels: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般风险",
  high: "较大风险",
  critical: "重大风险",
};
