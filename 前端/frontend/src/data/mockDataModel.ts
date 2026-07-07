import { dataModelSnapshotSchema } from "@/schemas/businessSchemas";
import type { DataModelSnapshot, FeatureDimension } from "@/types/business";
import { generatedChannelNames, mockUpdatedAt, realChannelNames } from "./mockConstants";

const realFeatures: FeatureDimension[] = realChannelNames.map((name, index) => ({
  id: `F-REAL-${String(index + 1).padStart(2, "0")}`,
  name,
  type: "real_channel",
  sourceChannel: `REAL-${String(index + 1).padStart(2, "0")}`,
  unit: index < 2 ? "%" : index < 4 ? "ppm" : "工程单位",
  calculation: "传感器通道最新值与滑动窗口统计。",
  modelUsage: "预警评估输入",
  boundary: "真实传感器来源，当前仅为 mock 字典展示。",
}));

const generatedFeatures: FeatureDimension[] = generatedChannelNames.map((name, index) => ({
  id: `F-GEN-${String(index + 1).padStart(2, "0")}`,
  name,
  type: "generated_channel",
  sourceChannel: `GEN-${String(index + 1).padStart(2, "0")}`,
  unit: "指数",
  calculation: "WGAN-GP 结果衍生的前兆指标摘要。",
  modelUsage: "辅助前兆识别",
  boundary: "生成通道为辅助前兆指标，不替代真实传感器监测。",
}));

export const featureDictionary = [...realFeatures, ...generatedFeatures];

export const mockDataModel = dataModelSnapshotSchema.parse({
  dynamicData: [
    { label: "动态通道", value: "以后端 meta_info / sensors/latest 返回为准" },
    { label: "最新数据时间", value: mockUpdatedAt },
    { label: "质量状态", value: "mock 良好" },
  ],
  staticData: [
    { label: "区域资料", value: "3 个演示区域" },
    { label: "设备资料", value: "约 63 个后端元数据节点" },
    { label: "责任单位", value: "6 个演示单位" },
  ],
  featureDictionary,
  datasetVersions: [
    { version: "DS-2026-06-MOCK", timeRange: "2026-06-01 至 2026-06-27", sampleCount: 12800, channelCoverage: "以后端元数据为准", qualityScore: 91, relatedModel: "MODEL-MOCK-1.2", note: "演示数据集版本，不可下载为真实训练数据。" },
    { version: "DS-2026-05-MOCK", timeRange: "2026-05-01 至 2026-05-31", sampleCount: 10400, channelCoverage: "历史 mock 覆盖说明", qualityScore: 87, relatedModel: "MODEL-MOCK-1.1", note: "历史 mock 版本。" },
  ],
  augmentation: {
    datasetVersion: "DS-2026-06-MOCK",
    realChannelCount: 63,
    generatedChannelCount: 0,
    featureCount: 63,
    physicalConstraintRate: 0.96,
    adversarialValidationAuc: 0.81,
    ksPassRate: 0.89,
    boundary: "当前通道口径以后端元数据和动态数据为准；历史 WGAN-GP 生成指标仅作遗留说明，不冒充真实传感器。",
  },
  modelEvaluation: {
    recall: 0.91,
    falseAlarmRate: 0.08,
    macroF1: 0.87,
    accuracy: 0.9,
    evaluatedAt: "2026-06-27 09:30",
    confusionMatrix: [
      { actual: "低/一般", predicted: "低/一般", count: 84 },
      { actual: "低/一般", predicted: "较大/重大", count: 7 },
      { actual: "较大/重大", predicted: "低/一般", count: 5 },
      { actual: "较大/重大", predicted: "较大/重大", count: 52 },
    ],
    ablationExperiments: [
      { name: "无增强", recall: 0.82, falseAlarmRate: 0.12, macroF1: 0.79, accuracy: 0.83 },
      { name: "普通增强", recall: 0.86, falseAlarmRate: 0.1, macroF1: 0.82, accuracy: 0.86 },
      { name: "WGAN-GP", recall: 0.89, falseAlarmRate: 0.09, macroF1: 0.85, accuracy: 0.88 },
      { name: "物理约束 WGAN-GP", recall: 0.91, falseAlarmRate: 0.08, macroF1: 0.87, accuracy: 0.9 },
    ],
    confusionMatrixPlaceholder: "使用 mock 混淆矩阵展示评估结构。",
    ablationPlaceholder: "消融实验摘要：去除生成前兆、去除微震、去除压力类指标。",
    datasetVersion: "DS-2026-06-MOCK",
    modelVersion: "MODEL-MOCK-1.2",
    limitations: ["样本来自 mock 契约，不作为正式验收指标。", "未接真实评估任务或模型服务。", "误报率与召回率仅用于页面结构展示。"],
  },
  modelVersions: [
    { version: "MODEL-MOCK-1.2", datasetVersion: "DS-2026-06-MOCK", evaluationSummary: "召回率 91%，Macro-F1 87%", releaseAt: "2026-06-27", status: "active", changeLog: "补充后端元数据通道口径和历史生成指标边界说明。" },
    { version: "MODEL-MOCK-1.1", datasetVersion: "DS-2026-05-MOCK", evaluationSummary: "召回率 88%，Macro-F1 84%", releaseAt: "2026-05-31", status: "archived", changeLog: "历史演示版本。" },
  ],
}) as DataModelSnapshot;
