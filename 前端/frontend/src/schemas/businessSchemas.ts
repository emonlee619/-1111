import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "normal", "high", "critical"]);
export const statusToneSchema = z.enum(["neutral", "success", "warning", "danger", "info"]);
export const channelSourceSchema = z.enum(["real_sensor", "generated_premonition"]);
export const channelHealthSchema = z.enum(["online", "calibrating", "maintenance", "offline"]);
export const handlingStatusSchema = z.enum(["pending", "verifying", "handling", "reviewing", "closed"]);
export const workflowStatusSchema = z.enum(["pending", "active", "done", "blocked"]);
export const versionStatusSchema = z.enum(["draft", "evaluation", "active", "archived"]);
export const doublePreventionSourceTypeSchema = z.enum(["real_sensor", "physics_constrained", "static_prior", "manual_check"]);
export const majorHazardCandidateSchema = z.enum(["none", "pending", "confirmed"]);

export const metricCardSchema = z.object({
  label: z.string(),
  value: z.string(),
  hint: z.string(),
  trend: z.string().optional(),
  risk: riskLevelSchema.optional(),
});

export const keyValueSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  hint: z.string().optional(),
});

export const timelineItemSchema = z.object({
  time: z.string(),
  title: z.string(),
  description: z.string(),
  tone: statusToneSchema.optional(),
});

export const sensorChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: channelSourceSchema,
  unit: z.string(),
  regionId: z.string(),
  regionName: z.string(),
  health: channelHealthSchema,
  sensorCode: z.string().optional(),
  threshold: z.number().optional(),
  criticalThreshold: z.number().optional(),
  statusLabel: z.string().optional(),
  sampleWindow: z.string().optional(),
  latestValue: z.number().optional(),
  latestSampleAt: z.string(),
  calibrationStatus: z.string(),
  maintainer: z.string(),
});

export const mineProductionPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  pointType: z.string(),
  regionName: z.string(),
  tunnelName: z.string(),
  value: z.number(),
  threshold: z.number(),
  unit: z.string(),
  riskLevel: riskLevelSchema,
  status: z.string(),
  owner: z.string(),
  updatedAt: z.string(),
  x: z.number(),
  y: z.number(),
});

export const mineVentilationFlowSchema = z.object({
  id: z.string(),
  label: z.string(),
  from: z.string(),
  to: z.string(),
  volume: z.string(),
  status: z.string(),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

export const mineProductionAreaSchema = z.object({
  id: z.string(),
  label: z.string(),
  role: z.string(),
  status: z.string(),
  riskLevel: riskLevelSchema,
  x: z.number(),
  y: z.number(),
});

export const productionAlertSummarySchema = z.object({
  id: z.string(),
  area: z.string(),
  point: z.string(),
  currentValue: z.number(),
  threshold: z.number(),
  unit: z.string(),
  riskLevel: riskLevelSchema,
  status: z.string(),
  owner: z.string(),
  updatedAt: z.string(),
  href: z.string(),
});

export const monitoringTrendChannelSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string(),
  unit: z.string(),
  color: z.string(),
  currentValue: z.number(),
  threshold: z.number(),
  criticalThreshold: z.number().optional(),
  status: z.string(),
  updatedAt: z.string(),
  samples: z.array(z.object({
    time: z.string(),
    value: z.number(),
  })),
});

export const todoTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  dueAt: z.string(),
  status: handlingStatusSchema,
  riskLevel: riskLevelSchema,
});

export const regionRiskSummarySchema = z.object({
  regionId: z.string(),
  regionName: z.string(),
  riskLevel: riskLevelSchema,
  hazardCount: z.number(),
  warningCount: z.number(),
  updatedAt: z.string(),
  controlStatus: z.string(),
});

export const dashboardSnapshotSchema = z.object({
  metrics: z.array(metricCardSchema),
  regionRanking: z.array(regionRiskSummarySchema),
  trendPlaceholders: z.array(keyValueSchema),
  todoTasks: z.array(todoTaskSchema),
  productionAreas: z.array(mineProductionAreaSchema),
  productionPoints: z.array(mineProductionPointSchema),
  ventilationFlows: z.array(mineVentilationFlowSchema),
  latestAlerts: z.array(productionAlertSummarySchema),
  updatedAt: z.string(),
});

export const monitoringSnapshotSchema = z.object({
  realChannels: z.array(sensorChannelSchema),
  trendChannels: z.array(monitoringTrendChannelSchema),
  channelHealth: z.array(keyValueSchema),
  abnormalFluctuations: z.array(timelineItemSchema),
  realtimePlaceholders: z.array(keyValueSchema),
  updatedAt: z.string(),
});

export const warningEventSchema = z.object({
  id: z.string(),
  riskLevel: riskLevelSchema,
  eventTime: z.string(),
  regionId: z.string(),
  regionName: z.string(),
  relatedChannels: z.array(z.string()),
  status: handlingStatusSchema,
  owner: z.string(),
  summary: z.string(),
  triggerPoint: z.string().optional(),
  currentValue: z.number().optional(),
  threshold: z.number().optional(),
  unit: z.string().optional(),
  overLimitRatio: z.string().optional(),
  confirmStatus: z.string().optional(),
});

export const warningEventDetailSchema = warningEventSchema.extend({
  disposalRecords: z.array(timelineItemSchema),
  advice: z.array(z.string()),
  tracingEntry: z.string(),
});

export const warningSnapshotSchema = z.object({
  events: z.array(warningEventSchema),
  filters: z.array(keyValueSchema),
  detail: warningEventDetailSchema,
});

export const attentionWeightSchema = z.object({
  feature: z.string(),
  channelId: z.string(),
  weight: z.number(),
  contribution: z.string(),
});

export const sourceTracingSnapshotSchema = z.object({
  attentionWeights: z.array(attentionWeightSchema),
  contributionMetrics: z.array(keyValueSchema),
  causalChain: z.array(timelineItemSchema),
  detail: z.array(keyValueSchema),
});

export const workflowStepSchema = z.object({
  name: z.string(),
  owner: z.string(),
  time: z.string(),
  status: workflowStatusSchema,
  materialSummary: z.string(),
  nextHint: z.string(),
});

export const riskControlItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  riskLevel: riskLevelSchema,
  regionName: z.string(),
  ownerUnit: z.string(),
  measureSummary: z.string(),
  inspectionFrequency: z.string(),
  triggerSource: z.string(),
  sourceType: doublePreventionSourceTypeSchema,
  relatedChannels: z.array(z.string()),
  supportingRealChannels: z.array(z.string()),
  owner: z.string().optional(),
  responsiblePerson: z.string(),
  status: z.string(),
  needsHumanReview: z.boolean(),
  majorHazardCandidate: majorHazardCandidateSchema,
  modelScore: z.number(),
  modelVersion: z.string(),
  warningEventId: z.string().optional(),
  reliabilityWeight: z.number(),
});

export const riskMapCellSchema = z.object({
  id: z.string(),
  regionName: z.string(),
  riskLevel: riskLevelSchema,
  riskPoint: z.string(),
  ownerUnit: z.string().optional(),
  measureSummary: z.string().optional(),
  inspectionFrequency: z.string().optional(),
  triggerSource: z.string().optional(),
  sourceType: doublePreventionSourceTypeSchema.optional(),
  relatedChannels: z.array(z.string()).optional(),
  supportingRealChannels: z.array(z.string()).optional(),
  owner: z.string().optional(),
  responsiblePerson: z.string().optional(),
  status: z.string().optional(),
  needsHumanReview: z.boolean().optional(),
  majorHazardCandidate: majorHazardCandidateSchema.optional(),
  modelScore: z.number().optional(),
  modelVersion: z.string().optional(),
  warningEventId: z.string().optional(),
  reliabilityWeight: z.number().optional(),
});

export const riskCardSchema = riskControlItemSchema.extend({
  emergencyAction: z.string(),
  responsiblePerson: z.string(),
  relatedHazards: z.array(z.string()),
});

export const measureLibraryItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  applicableRisk: z.string(),
  executionFrequency: z.string(),
  role: z.string(),
  checklist: z.string(),
  sourceType: doublePreventionSourceTypeSchema,
  relatedChannels: z.array(z.string()),
  ownerUnit: z.string(),
});

export const hazardLedgerItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  riskLevel: riskLevelSchema,
  regionName: z.string(),
  owner: z.string(),
  currentStep: z.string(),
  deadline: z.string(),
  overdueDays: z.number(),
  status: handlingStatusSchema,
  ownerUnit: z.string(),
  responsiblePerson: z.string(),
  measureSummary: z.string(),
  triggerSource: z.string(),
  sourceType: doublePreventionSourceTypeSchema,
  relatedChannels: z.array(z.string()),
  supportingRealChannels: z.array(z.string()),
  needsHumanReview: z.boolean(),
  majorHazardCandidate: majorHazardCandidateSchema,
  modelScore: z.number(),
  modelVersion: z.string(),
  warningEventId: z.string().optional(),
  reliabilityWeight: z.number(),
});

export const overdueEscalationItemSchema = z.object({
  hazardId: z.string(),
  owner: z.string(),
  overdueDays: z.number(),
  escalationLevel: z.string(),
  notifyStrategy: z.string(),
  suggestion: z.string(),
});

export const reviewCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  objectType: z.string(),
  conclusion: z.string(),
  improvement: z.string(),
  trackingStatus: z.string(),
});

export const doublePreventionConfigSchema = z.object({
  riskLevelRules: z.array(keyValueSchema),
  closureDeadlineRules: z.array(keyValueSchema),
  overdueEscalationRules: z.array(keyValueSchema),
  inspectionFrequencyRules: z.array(keyValueSchema),
  responsibilityOrganizations: z.array(keyValueSchema),
  notificationBoundary: z.array(keyValueSchema),
  modelIntegrationBoundary: z.array(keyValueSchema),
  realSensorTriggerBoundary: z.array(keyValueSchema),
  physicsConstrainedMetricBoundary: z.array(keyValueSchema),
  mockApiCoverage: z.array(keyValueSchema),
});

export const doublePreventionCultureBoardSchema = z.object({
  philosophy: z.array(keyValueSchema),
  colorRiskGuide: z.array(keyValueSchema),
  workflowGuide: z.array(keyValueSchema),
  realSensorTriggerGuide: z.array(keyValueSchema),
  physicsConstrainedBoundary: z.array(keyValueSchema),
  knowledgeCultureBoardBoundary: z.array(keyValueSchema),
  excellentCases: z.array(keyValueSchema),
  teamPromotionItems: z.array(keyValueSchema),
  assessmentMetrics: z.array(keyValueSchema),
});

export const doublePreventionSnapshotSchema = z.object({
  riskControls: z.array(riskControlItemSchema),
  riskMap: z.array(riskMapCellSchema),
  riskCards: z.array(riskCardSchema),
  measures: z.array(measureLibraryItemSchema),
  hazards: z.array(hazardLedgerItemSchema),
  workflowSteps: z.array(workflowStepSchema),
  overdueItems: z.array(overdueEscalationItemSchema),
  reviews: z.array(reviewCaseSchema),
  config: doublePreventionConfigSchema,
  cultureBoard: doublePreventionCultureBoardSchema,
});

export const regionDetailSchema = regionRiskSummarySchema.extend({
  relatedSensors: z.array(z.string()),
  relatedHazards: z.array(z.string()),
  controlMeasures: z.array(z.string()),
  warningHistory: z.array(timelineItemSchema),
});

export const twinSnapshotSchema = z.object({
  tunnelSegments: z.array(keyValueSchema),
  heatmapCells: z.array(riskMapCellSchema),
  sensorPoints: z.array(sensorChannelSchema),
  spatialZones: z.array(mineProductionAreaSchema),
  ventilationFlows: z.array(mineVentilationFlowSchema),
  patrolStates: z.array(keyValueSchema),
});

export const knowledgeEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  scenario: z.string(),
  summary: z.string(),
});

export const knowledgeSnapshotSchema = z.object({
  standards: z.array(knowledgeEntrySchema),
  causalGraph: z.array(keyValueSchema),
  cultureBoards: z.array(keyValueSchema),
});

export const agentSnapshotSchema = z.object({
  recommendedQuestions: z.array(z.string()),
  mockAnswer: z.string(),
  citations: z.array(knowledgeEntrySchema),
  safetyPrompts: z.array(z.string()),
});

export const featureDimensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["real_channel", "generated_channel"]),
  sourceChannel: z.string(),
  unit: z.string(),
  calculation: z.string(),
  modelUsage: z.string(),
  boundary: z.string(),
});

export const datasetVersionSchema = z.object({
  version: z.string(),
  timeRange: z.string(),
  sampleCount: z.number(),
  channelCoverage: z.string(),
  qualityScore: z.number(),
  relatedModel: z.string(),
  note: z.string(),
});

export const augmentationValidationSchema = z.object({
  datasetVersion: z.string(),
  realChannelCount: z.number(),
  generatedChannelCount: z.number(),
  featureCount: z.number(),
  physicalConstraintRate: z.number(),
  adversarialValidationAuc: z.number(),
  ksPassRate: z.number(),
  boundary: z.string(),
});

export const modelEvaluationSchema = z.object({
  recall: z.number(),
  falseAlarmRate: z.number(),
  macroF1: z.number(),
  accuracy: z.number().optional(),
  evaluatedAt: z.string().optional(),
  confusionMatrix: z.array(z.object({
    actual: z.string(),
    predicted: z.string(),
    count: z.number(),
  })).optional(),
  ablationExperiments: z.array(z.object({
    name: z.string(),
    recall: z.number(),
    falseAlarmRate: z.number(),
    macroF1: z.number(),
    accuracy: z.number(),
  })).optional(),
  confusionMatrixPlaceholder: z.string(),
  ablationPlaceholder: z.string(),
  datasetVersion: z.string(),
  modelVersion: z.string(),
  limitations: z.array(z.string()),
});

export const modelVersionSchema = z.object({
  version: z.string(),
  datasetVersion: z.string(),
  evaluationSummary: z.string(),
  releaseAt: z.string(),
  status: versionStatusSchema,
  changeLog: z.string(),
});

export const dataModelSnapshotSchema = z.object({
  dynamicData: z.array(keyValueSchema),
  staticData: z.array(keyValueSchema),
  featureDictionary: z.array(featureDimensionSchema),
  datasetVersions: z.array(datasetVersionSchema),
  augmentation: augmentationValidationSchema,
  modelEvaluation: modelEvaluationSchema,
  modelVersions: z.array(modelVersionSchema),
});

export const systemUserSchema = z.object({
  name: z.string(),
  role: z.string(),
  unit: z.string(),
  permissionScope: z.string(),
  status: z.string(),
  lastLoginAt: z.string(),
});

export const operationLogSchema = z.object({
  time: z.string(),
  actor: z.string(),
  module: z.string(),
  action: z.string(),
  result: z.string(),
  riskLevel: riskLevelSchema.optional(),
});

export const systemSnapshotSchema = z.object({
  users: z.array(systemUserSchema),
  logs: z.array(operationLogSchema),
  configs: z.array(keyValueSchema),
});
