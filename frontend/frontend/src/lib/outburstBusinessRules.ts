import { channelSourceLabel, inferChannelSourceType, type ChannelSourceType } from "@/lib/outburstChannelPolicy";
import type { OutburstClosureTemplateType } from "@/data/outburstClosureTemplates";
import type { RiskLevel } from "@/types/risk";

export type OutburstSourceType = ChannelSourceType;

export type ContributionExplanation = {
  sensor_id: string;
  sensorId: string;
  sourceType: OutburstSourceType;
  sourceLabel: string;
  contribution: number;
  rank: number;
  title: string;
  explanation: string;
  boundary: string;
  disposalBoundary: string;
  verificationActions: string[];
};

export function classifyOutburstSource(input: { sensorId?: string | null; sourceType?: string | null; slot?: string | null }): OutburstSourceType {
  return inferChannelSourceType(input.sensorId ?? input.slot, input.sourceType);
}

export function getContributionExplanation(input: { sensor_id?: string; sensorId?: string; source_type?: string; sourceType?: string; contribution?: number; rank?: number }): ContributionExplanation {
  const sensorId = input.sensor_id ?? input.sensorId ?? "unknown";
  const sourceType = classifyOutburstSource({ sensorId, sourceType: input.source_type ?? input.sourceType });
  const base = {
    sensor_id: sensorId,
    sensorId,
    sourceType,
    sourceLabel: channelSourceLabel(sourceType),
    contribution: Number(input.contribution ?? 0),
    rank: "rank" in input && typeof input.rank === "number" ? input.rank : 0,
  };
  if (sourceType === "physics_constrained") {
    return {
      ...base,
      title: "物理约束辅助信号",
      explanation: "该贡献用于提示风险链路和复核优先级，不等同于真实传感器实测。",
      boundary: "不能单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。",
      disposalBoundary: "仅进入待复核，不直接形成处置命令。",
      verificationActions: ["核对支撑真实传感器", "核对现场记录", "提交人工复核"],
    };
  }
  if (sourceType === "real_sensor") {
    return {
      ...base,
      title: "真实传感器信号",
      explanation: "该贡献来自后端真实传感器通道或其聚合结果，可作为复核线索。",
      boundary: "仍需结合规程、现场记录和人工审核形成处置结论。",
      disposalBoundary: "可作为复核线索，最终处置仍按制度和人工审核执行。",
      verificationActions: ["核对传感器状态", "核对调校记录", "核对同区域关联测点"],
    };
  }
  return {
    ...base,
    title: "辅助风险线索",
    explanation: "该贡献来自静态、人工或未识别来源，应作为风险排查线索。",
    boundary: "不得替代现场复核和人工法规审核。",
    disposalBoundary: "来源确认前不进入正式强制处置结论。",
    verificationActions: ["补充来源说明", "人工确认可信度", "关联现场闭环记录"],
  };
}

export function getClosureTemplateType(sourceType: OutburstSourceType): OutburstClosureTemplateType {
  if (sourceType === "physics_constrained") return "physics_constrained_event";
  if (sourceType === "static_prior" || sourceType === "manual_check") return "static_or_manual_event";
  if (sourceType === "real_sensor") return "real_sensor_event";
  return "backend_reported_event";
}

export function getDisposalLevel(sourceType: OutburstSourceType, riskLevel?: RiskLevel | string | null) {
  if (sourceType === "physics_constrained") return "review_only";
  if (riskLevel === "critical" || riskLevel === "high") return "site_review";
  return "monitor";
}
