import { sourceTracingSnapshotSchema } from "@/schemas/businessSchemas";
import type { SourceTracingSnapshot } from "@/types/business";

export const mockSourceTracing = sourceTracingSnapshotSchema.parse({
  attentionWeights: [
    { feature: "瓦斯变化率前兆", channelId: "GEN-01", weight: 0.24, contribution: "短窗变化率贡献最高，需结合真实通道复核。" },
    { feature: "风压 FY-01", channelId: "REAL-06", weight: 0.18, contribution: "与瓦斯浓度波动同窗出现。" },
    { feature: "微震能量 WZ-01", channelId: "REAL-12", weight: 0.13, contribution: "演示样本中与风险抬升相关。" },
    { feature: "采掘扰动指数", channelId: "GEN-14", weight: 0.11, contribution: "生成前兆指标，仅作辅助解释。" },
  ],
  contributionMetrics: [
    { label: "解释窗口", value: "30 min" },
    { label: "贡献指标", value: 8 },
    { label: "疑似危险源", value: "东翼回风巷瓦斯-通风扰动链路" },
  ],
  causalChain: [
    { time: "T-30", title: "通风扰动", description: "风压与风速出现轻微波动。", tone: "info" },
    { time: "T-18", title: "瓦斯变化率抬升", description: "真实通道与生成前兆同时进入关注区间。", tone: "warning" },
    { time: "T-05", title: "多通道协同异常", description: "形成 mock 预警事件，不作为最终事故原因。", tone: "danger" },
  ],
  detail: [
    { label: "溯源结论性质", value: "辅助解释" },
    { label: "复核责任", value: "监测一组 + 安全科" },
    { label: "边界", value: "不调用真实模型推理，不写入真实事件台账" },
  ],
}) as SourceTracingSnapshot;
