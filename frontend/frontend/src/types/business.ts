import type { MetricCardModel } from "./navigation";
import type { RiskLevel, StatusTone } from "./risk";

export type DataSourceKind = "mock" | "static";

export type RecordValue = string | number | boolean | null;

export type TableColumn = {
  key: string;
  label: string;
};

export type KeyValueItem = {
  label: string;
  value: RecordValue;
  hint?: string;
};

export type BusinessTableSection = {
  kind: "table";
  title: string;
  description?: string;
  columns: TableColumn[];
  rows: Record<string, RecordValue>[];
};

export type BusinessDetailSection = {
  kind: "detail";
  title: string;
  description?: string;
  items: KeyValueItem[];
};

export type BusinessListSection = {
  kind: "list";
  title: string;
  description?: string;
  items: string[];
};

export type BusinessTimelineSection = {
  kind: "timeline";
  title: string;
  description?: string;
  items: TimelineItem[];
};

export type BusinessWorkflowSection = {
  kind: "workflow";
  title: string;
  description?: string;
  steps: WorkflowStep[];
};

export type BusinessChartPlaceholderSection = {
  kind: "chart";
  title: string;
  description?: string;
  status: string;
  metrics?: KeyValueItem[];
};

export type BusinessSection =
  | BusinessTableSection
  | BusinessDetailSection
  | BusinessListSection
  | BusinessTimelineSection
  | BusinessWorkflowSection
  | BusinessChartPlaceholderSection;

export type BusinessPageContent = {
  path: string;
  metrics: MetricCardModel[];
  sections: BusinessSection[];
  statusNotes: string[];
  boundaryNotes: string[];
  dataSource: DataSourceKind;
  updatedAt: string;
};

export type ChannelSource = "real_sensor" | "generated_premonition";

export type ChannelHealth = "online" | "calibrating" | "maintenance" | "offline";

export type HandlingStatus = "pending" | "verifying" | "handling" | "reviewing" | "closed";

export type WorkflowStatus = "pending" | "active" | "done" | "blocked";

export type VersionStatus = "draft" | "evaluation" | "active" | "archived";

export type DashboardSnapshot = {
  metrics: MetricCardModel[];
  regionRanking: RegionRiskSummary[];
  trendPlaceholders: KeyValueItem[];
  todoTasks: TodoTask[];
  productionAreas: MineProductionArea[];
  productionPoints: MineProductionPoint[];
  ventilationFlows: MineVentilationFlow[];
  latestAlerts: ProductionAlertSummary[];
  updatedAt: string;
};

export type TodoTask = {
  id: string;
  title: string;
  owner: string;
  dueAt: string;
  status: HandlingStatus;
  riskLevel: RiskLevel;
};

export type SensorChannel = {
  id: string;
  name: string;
  source: ChannelSource;
  unit: string;
  regionId: string;
  regionName: string;
  health: ChannelHealth;
  sensorCode?: string;
  threshold?: number;
  criticalThreshold?: number;
  statusLabel?: string;
  sampleWindow?: string;
  latestValue?: number;
  latestSampleAt: string;
  calibrationStatus: string;
  maintainer: string;
};

export type MineProductionPoint = {
  id: string;
  code: string;
  label: string;
  pointType: string;
  regionName: string;
  tunnelName: string;
  value: number;
  threshold: number;
  unit: string;
  riskLevel: RiskLevel;
  status: string;
  owner: string;
  updatedAt: string;
  x: number;
  y: number;
};

export type MineVentilationFlow = {
  id: string;
  label: string;
  from: string;
  to: string;
  volume: string;
  status: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type MineProductionArea = {
  id: string;
  label: string;
  role: string;
  status: string;
  riskLevel: RiskLevel;
  x: number;
  y: number;
};

export type ProductionAlertSummary = {
  id: string;
  area: string;
  point: string;
  currentValue: number;
  threshold: number;
  unit: string;
  riskLevel: RiskLevel;
  status: string;
  owner: string;
  updatedAt: string;
  href: string;
};

export type MonitoringTrendSample = {
  time: string;
  value: number;
};

export type MonitoringTrendChannel = {
  id: string;
  label: string;
  code: string;
  unit: string;
  color: string;
  currentValue: number;
  threshold: number;
  criticalThreshold?: number;
  status: string;
  updatedAt: string;
  samples: MonitoringTrendSample[];
};

export type MonitoringSnapshot = {
  realChannels: SensorChannel[];
  trendChannels: MonitoringTrendChannel[];
  channelHealth: KeyValueItem[];
  abnormalFluctuations: TimelineItem[];
  realtimePlaceholders: KeyValueItem[];
  updatedAt: string;
};

export type WarningEvent = {
  id: string;
  riskLevel: RiskLevel;
  eventTime: string;
  regionId: string;
  regionName: string;
  relatedChannels: string[];
  status: HandlingStatus;
  owner: string;
  summary: string;
  triggerPoint?: string;
  currentValue?: number;
  threshold?: number;
  unit?: string;
  overLimitRatio?: string;
  confirmStatus?: string;
};

export type WarningSnapshot = {
  events: WarningEvent[];
  filters: KeyValueItem[];
  detail: WarningEventDetail;
};

export type WarningEventDetail = WarningEvent & {
  disposalRecords: TimelineItem[];
  advice: string[];
  tracingEntry: string;
};

export type AttentionWeight = {
  feature: string;
  channelId: string;
  weight: number;
  contribution: string;
};

export type SourceTracingSnapshot = {
  attentionWeights: AttentionWeight[];
  contributionMetrics: KeyValueItem[];
  causalChain: TimelineItem[];
  detail: KeyValueItem[];
};

export type RegionRiskSummary = {
  regionId: string;
  regionName: string;
  riskLevel: RiskLevel;
  hazardCount: number;
  warningCount: number;
  updatedAt: string;
  controlStatus: string;
};

export type RegionDetail = RegionRiskSummary & {
  relatedSensors: string[];
  relatedHazards: string[];
  controlMeasures: string[];
  warningHistory: TimelineItem[];
};

export type DoublePreventionSnapshot = {
  riskControls: RiskControlItem[];
  riskMap: RiskMapCell[];
  riskCards: RiskCard[];
  measures: MeasureLibraryItem[];
  hazards: HazardLedgerItem[];
  workflowSteps: WorkflowStep[];
  overdueItems: OverdueEscalationItem[];
  reviews: ReviewCase[];
  config: DoublePreventionConfig;
  cultureBoard: DoublePreventionCultureBoard;
};

export type DoublePreventionSourceType = "real_sensor" | "physics_constrained" | "static_prior" | "manual_check";

export type MajorHazardCandidate = "none" | "pending" | "confirmed";

export type DoublePreventionTriggerFields = {
  triggerSource: string;
  sourceType: DoublePreventionSourceType;
  relatedChannels: string[];
  supportingRealChannels: string[];
  owner?: string;
  responsiblePerson: string;
  status: string;
  needsHumanReview: boolean;
  majorHazardCandidate: MajorHazardCandidate;
  modelScore: number;
  modelVersion: string;
  warningEventId?: string;
  reliabilityWeight: number;
};

export type RiskControlItem = {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  regionName: string;
  ownerUnit: string;
  measureSummary: string;
  inspectionFrequency: string;
} & DoublePreventionTriggerFields;

export type RiskMapCell = {
  id: string;
  regionName: string;
  riskLevel: RiskLevel;
  riskPoint: string;
  ownerUnit?: string;
  measureSummary?: string;
  inspectionFrequency?: string;
} & Partial<DoublePreventionTriggerFields>;

export type RiskCard = RiskControlItem & {
  emergencyAction: string;
  responsiblePerson: string;
  relatedHazards: string[];
};

export type MeasureLibraryItem = {
  id: string;
  category: string;
  applicableRisk: string;
  executionFrequency: string;
  role: string;
  checklist: string;
  sourceType: DoublePreventionSourceType;
  relatedChannels: string[];
  ownerUnit: string;
};

export type HazardLedgerItem = {
  id: string;
  description: string;
  riskLevel: RiskLevel;
  regionName: string;
  owner: string;
  currentStep: string;
  deadline: string;
  overdueDays: number;
  status: HandlingStatus;
  ownerUnit: string;
  responsiblePerson: string;
  measureSummary: string;
  triggerSource: string;
  sourceType: DoublePreventionSourceType;
  relatedChannels: string[];
  supportingRealChannels: string[];
  needsHumanReview: boolean;
  majorHazardCandidate: MajorHazardCandidate;
  modelScore: number;
  modelVersion: string;
  warningEventId?: string;
  reliabilityWeight: number;
};

export type WorkflowStep = {
  name: string;
  owner: string;
  time: string;
  status: WorkflowStatus;
  materialSummary: string;
  nextHint: string;
};

export type OverdueEscalationItem = {
  hazardId: string;
  owner: string;
  overdueDays: number;
  escalationLevel: string;
  notifyStrategy: string;
  suggestion: string;
};

export type ReviewCase = {
  id: string;
  title: string;
  objectType: string;
  conclusion: string;
  improvement: string;
  trackingStatus: string;
};

export type DoublePreventionConfig = {
  riskLevelRules: KeyValueItem[];
  closureDeadlineRules: KeyValueItem[];
  overdueEscalationRules: KeyValueItem[];
  inspectionFrequencyRules: KeyValueItem[];
  responsibilityOrganizations: KeyValueItem[];
  notificationBoundary: KeyValueItem[];
  modelIntegrationBoundary: KeyValueItem[];
  realSensorTriggerBoundary: KeyValueItem[];
  physicsConstrainedMetricBoundary: KeyValueItem[];
  mockApiCoverage: KeyValueItem[];
};

export type DoublePreventionCultureBoard = {
  philosophy: KeyValueItem[];
  colorRiskGuide: KeyValueItem[];
  workflowGuide: KeyValueItem[];
  realSensorTriggerGuide: KeyValueItem[];
  physicsConstrainedBoundary: KeyValueItem[];
  knowledgeCultureBoardBoundary: KeyValueItem[];
  excellentCases: KeyValueItem[];
  teamPromotionItems: KeyValueItem[];
  assessmentMetrics: KeyValueItem[];
};

export type TwinSnapshot = {
  tunnelSegments: KeyValueItem[];
  heatmapCells: RiskMapCell[];
  sensorPoints: SensorChannel[];
  spatialZones: MineProductionArea[];
  ventilationFlows: MineVentilationFlow[];
  patrolStates: KeyValueItem[];
};

export type KnowledgeSnapshot = {
  standards: KnowledgeEntry[];
  causalGraph: KeyValueItem[];
  cultureBoards: KeyValueItem[];
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  category: string;
  scenario: string;
  summary: string;
};

export type AgentSnapshot = {
  recommendedQuestions: string[];
  mockAnswer: string;
  citations: KnowledgeEntry[];
  safetyPrompts: string[];
};

export type DataModelSnapshot = {
  dynamicData: KeyValueItem[];
  staticData: KeyValueItem[];
  featureDictionary: FeatureDimension[];
  datasetVersions: DatasetVersion[];
  augmentation: AugmentationValidation;
  modelEvaluation: ModelEvaluation;
  modelVersions: ModelVersion[];
};

export type FeatureDimension = {
  id: string;
  name: string;
  type: "real_channel" | "generated_channel";
  sourceChannel: string;
  unit: string;
  calculation: string;
  modelUsage: string;
  boundary: string;
};

export type DatasetVersion = {
  version: string;
  timeRange: string;
  sampleCount: number;
  channelCoverage: string;
  qualityScore: number;
  relatedModel: string;
  note: string;
};

export type AugmentationValidation = {
  datasetVersion: string;
  realChannelCount: number;
  generatedChannelCount: number;
  featureCount: number;
  physicalConstraintRate: number;
  adversarialValidationAuc: number;
  ksPassRate: number;
  boundary: string;
};

export type ModelEvaluation = {
  recall: number;
  falseAlarmRate: number;
  macroF1: number;
  accuracy?: number;
  evaluatedAt?: string;
  confusionMatrix?: ConfusionMatrixCell[];
  ablationExperiments?: AblationExperiment[];
  confusionMatrixPlaceholder: string;
  ablationPlaceholder: string;
  datasetVersion: string;
  modelVersion: string;
  limitations: string[];
};

export type ConfusionMatrixCell = {
  actual: string;
  predicted: string;
  count: number;
};

export type AblationExperiment = {
  name: string;
  recall: number;
  falseAlarmRate: number;
  macroF1: number;
  accuracy: number;
};

export type ModelVersion = {
  version: string;
  datasetVersion: string;
  evaluationSummary: string;
  releaseAt: string;
  status: VersionStatus;
  changeLog: string;
};

export type SystemSnapshot = {
  users: SystemUser[];
  logs: OperationLog[];
  configs: KeyValueItem[];
};

export type SystemUser = {
  name: string;
  role: string;
  unit: string;
  permissionScope: string;
  status: string;
  lastLoginAt: string;
};

export type OperationLog = {
  time: string;
  actor: string;
  module: string;
  action: string;
  result: string;
  riskLevel?: RiskLevel;
};

export type TimelineItem = {
  time: string;
  title: string;
  description: string;
  tone?: StatusTone;
};
