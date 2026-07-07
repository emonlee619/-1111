import { mockDashboard } from "./mockDashboard";
import { mockDataModel } from "./mockDataModel";
import { mockDoublePrevention } from "./mockDoublePrevention";
import { mockRegions } from "./mockRegions";
import { mockSourceTracing } from "./mockSourceTracing";
import { mockWarnings } from "./mockWarnings";
import type { ChannelHealth, SensorChannel, WarningEvent } from "@/types/business";
import type { RiskLevel } from "@/types/risk";

export const riskScore: Record<RiskLevel, number> = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};

export const riskLabel: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般风险",
  high: "较大风险",
  critical: "重大风险",
};

export const healthLabel: Record<ChannelHealth, string> = {
  online: "在线",
  calibrating: "校验中",
  maintenance: "维护中",
  offline: "离线",
};

export function getRiskTrendData() {
  return mockDashboard.regionRanking.map((region, index) => ({
    name: region.regionName,
    riskScore: riskScore[region.riskLevel],
    warnings: region.warningCount,
    hazards: region.hazardCount,
    trend: Math.max(1, riskScore[region.riskLevel] + index - 1),
  }));
}

export function getRegionRiskChartData(regions = mockRegions) {
  return regions.map((region) => ({
    name: region.regionName,
    riskScore: riskScore[region.riskLevel],
    warnings: region.warningCount,
    hazards: region.hazardCount,
  }));
}

export function getWarningLevelData(events: WarningEvent[] = mockWarnings.events) {
  const counts: Record<RiskLevel, number> = { low: 0, normal: 0, high: 0, critical: 0 };
  events.forEach((event) => {
    counts[event.riskLevel] += 1;
  });
  return Object.entries(counts).map(([level, count]) => ({
    level,
    name: riskLabel[level as RiskLevel],
    count,
  }));
}

export function getChannelTrendData(channel?: SensorChannel) {
  const base = channel?.latestValue ?? 1;
  return ["09:00", "09:06", "09:12", "09:18", "09:24", "09:30"].map((time, index) => ({
    time,
    value: Number((base + Math.sin(index / 1.4) * 0.24 + index * 0.04).toFixed(2)),
    threshold: Number((base + 0.48).toFixed(2)),
  }));
}

export function getMonitoringSummary(channels: SensorChannel[]) {
  const online = channels.filter((channel) => channel.health === "online").length;
  const attention = channels.filter((channel) => channel.health !== "online").length;
  return { online, attention, total: channels.length };
}

export function getFeatureSourceData(features = mockDataModel.featureDictionary) {
  const real = features.filter((feature) => feature.type === "real_channel").length;
  const generated = features.filter((feature) => feature.type === "generated_channel").length;
  return [
    { name: "真实通道", value: real },
    { name: "生成前兆通道", value: generated },
  ];
}

export function getFeatureUsageOptions() {
  return Array.from(new Set(mockDataModel.featureDictionary.map((feature) => feature.modelUsage)));
}

export function getMetricComparisonData() {
  const evaluation = mockDataModel.modelEvaluation;
  return [
    { name: "召回率", value: Math.round(evaluation.recall * 100) },
    { name: "误报率", value: Math.round(evaluation.falseAlarmRate * 100) },
    { name: "Macro-F1", value: Math.round(evaluation.macroF1 * 100) },
    { name: "准确率", value: Math.round((evaluation.accuracy ?? 0) * 100) },
  ];
}

export function getAugmentationMetricData() {
  const augmentation = mockDataModel.augmentation;
  return [
    { name: "真实通道", value: augmentation.realChannelCount },
    { name: "生成通道", value: augmentation.generatedChannelCount },
    { name: "指标总数", value: augmentation.featureCount },
  ];
}

export function getValidationMetricData() {
  const augmentation = mockDataModel.augmentation;
  return [
    { name: "物理约束", value: Math.round(augmentation.physicalConstraintRate * 100) },
    { name: "对抗 AUC", value: Math.round(augmentation.adversarialValidationAuc * 100) },
    { name: "KS 通过", value: Math.round(augmentation.ksPassRate * 100) },
  ];
}

export function getAblationData() {
  return mockDataModel.modelEvaluation.ablationExperiments ?? [];
}

export function getAttentionChartData() {
  return mockSourceTracing.attentionWeights.map((item) => ({
    name: item.feature,
    weight: Number((item.weight * 100).toFixed(1)),
  }));
}

export function getRiskMatrixData() {
  return mockDoublePrevention.riskMap.map((item) => ({
    name: item.regionName,
    riskScore: riskScore[item.riskLevel],
    riskPoint: item.riskPoint,
  }));
}

export function getClosureEfficiencyData() {
  const done = mockDoublePrevention.workflowSteps.filter((step) => step.status === "done").length;
  const active = mockDoublePrevention.workflowSteps.filter((step) => step.status === "active").length;
  const pending = mockDoublePrevention.workflowSteps.filter((step) => step.status === "pending").length;
  return [
    { name: "已完成", value: done },
    { name: "进行中", value: active },
    { name: "未开始", value: pending },
  ];
}
