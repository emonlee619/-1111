export type ChannelSourceType = "real_sensor" | "physics_constrained" | "static_prior" | "manual_check" | "backend_reported" | "unknown";

export const REAL_SENSOR_CHANNEL_COUNT = 22;
export const PHYSICS_CONSTRAINED_CHANNEL_COUNT = 41;
export const DYNAMIC_CHANNEL_TOTAL = REAL_SENSOR_CHANNEL_COUNT + PHYSICS_CONSTRAINED_CHANNEL_COUNT;

export const CHANNEL_POLICY_TEXT =
  "通道数量以后端 meta、sensors/latest、stats 返回为准；R 类为真实传感器，B 类为物理约束生成/估计指标，B 类不能单独作为断电、撤人、重大隐患确认或执法结论依据。";

export function inferChannelSourceType(sensorId?: string | null, sourceType?: string | null): ChannelSourceType {
  const normalizedSource = String(sourceType ?? "").toLowerCase();
  if (normalizedSource.includes("physics") || normalizedSource.includes("generated") || normalizedSource.includes("estimate")) return "physics_constrained";
  if (normalizedSource.includes("real") || normalizedSource.includes("sensor")) return "real_sensor";
  if (normalizedSource.includes("static")) return "static_prior";
  if (normalizedSource.includes("manual")) return "manual_check";

  const id = String(sensorId ?? "").toUpperCase();
  if (/^R\d{2}$/.test(id)) return "real_sensor";
  if (/^B\d{2}$/.test(id)) return "physics_constrained";
  if (/^S\d{2}$/.test(id)) return "static_prior";
  if (id.startsWith("CHK-")) return "manual_check";
  return "unknown";
}

export function channelSourceLabel(sourceType: ChannelSourceType) {
  const labels: Record<ChannelSourceType, string> = {
    real_sensor: "真实传感器",
    physics_constrained: "物理约束生成/估计",
    static_prior: "静态先验",
    manual_check: "人工检查",
    backend_reported: "后端返回",
    unknown: "待识别",
  };
  return labels[sourceType];
}

export function formatObservedNodeCount(count?: number | null) {
  if (typeof count === "number" && Number.isFinite(count) && count > 0) return `${count} 项`;
  return "以后端返回为准";
}
