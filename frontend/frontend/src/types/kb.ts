/**
 * Stage 3 知识中枢类型定义
 *
 * 这些类型描述了 /api/kb/* 与前端知识中枢之间交换的数据结构。
 * 所有类型均与 Supabase 的 source_documents / document_chunks / knowledge_cards /
 * knowledge_embeddings / knowledge_relations / knowledge_rules / knowledge_templates /
 * knowledge_review_tasks 表结构对齐。
 *
 * 约束：
 * - 浏览器组件不得直接持有 service role key，只能消费这些类型化数据。
 * - B01-B41 为 physics_constrained（物理约束生成/估计），不是现场实测。
 */

/** 接口运行模式：online=正常连库；degraded=可读但 embedding/语义检索不可用；offline=Supabase 未配置或不可达。 */
export type KbApiMode = "online" | "degraded" | "offline";

/* ------------------------------------------------------------------ */
/* 基础实体（与 Supabase 表对齐）                                       */
/* ------------------------------------------------------------------ */

export type KbSourceType =
  | "real_sensor"
  | "physics_constrained"
  | "static_prior"
  | "manual_check"
  | "legal_standard"
  | "system_rule"
  | "unknown";

export type KbCategory =
  | "dynamic_indicator"
  | "static_risk"
  | "control_measure"
  | "hidden_danger_template"
  | "legal_basis"
  | "threshold_rule"
  | "cause_chain"
  | "risk_mechanism"
  | "ai_guardrail"
  | "report_template"
  | "faq";

/** source_documents 行。doc_type 为资料分类。 */
export type KbSourceDocument = {
  id: string;
  title: string;
  doc_type: string;
  storage_bucket: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_ext: string | null;
  file_size: number | null;
  source_org: string | null;
  publish_year: number | null;
  version: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

/** document_chunks 行。 */
export type KbDocumentChunk = {
  id: string;
  source_document_id: string;
  chunk_index: number | null;
  section_path: string | null;
  content: string;
  token_count: number | null;
  created_at: string | null;
};

/** knowledge_cards 行（完整字段）。 */
export type KbKnowledgeCard = {
  id: string;
  card_code: string;
  title: string;
  category: string;
  source_type: KbSourceType | string | null;
  summary: string | null;
  full_content: string | null;
  related_channels: string[] | null;
  related_risks: string[] | null;
  related_locations: string[] | null;
  physical_meaning: string | null;
  abnormal_signs: string[] | null;
  verification_actions: string[] | null;
  control_measures: string[] | null;
  legal_basis: string[] | null;
  threshold_rules: Record<string, unknown> | null;
  risk_level: string | null;
  reliability_weight: number | null;
  model_boundary: string | null;
  human_review_policy: string | null;
  source_document_ids: string[] | null;
  chunk_ids: string[] | null;
  confidence_level: string | null;
  needs_human_review: boolean;
  status: string;
  version: string | null;
  created_at: string;
  updated_at: string | null;
};

/** knowledge_relations 行。 */
export type KbRelation = {
  id: string;
  source_card_code: string;
  target_card_code: string;
  relation_type: string;
  description: string | null;
  confidence_level: string | null;
  created_at: string;
};

/** knowledge_rules 行。 */
export type KbRule = {
  id: string;
  rule_code: string;
  title: string;
  rule_type: string;
  applies_to_channels: string[] | null;
  condition_json: Record<string, unknown> | null;
  action_json: Record<string, unknown> | null;
  legal_basis: string[] | null;
  boundary_notes: string | null;
  requires_human_review: boolean;
  status: string;
  version: string | null;
  created_at: string;
};

/** knowledge_templates 行。 */
export type KbTemplate = {
  id: string;
  template_code: string;
  title: string;
  template_type: string;
  trigger_source_type: string | null;
  related_channels: string[] | null;
  fields_schema: Record<string, unknown>;
  default_content: Record<string, unknown> | null;
  status: string;
  version: string | null;
  created_at: string;
};

/** knowledge_review_tasks 行。 */
export type KbReviewTask = {
  id: string;
  target_type: string;
  target_id: string | null;
  card_code: string | null;
  review_status: string;
  review_reason: string | null;
  reviewer: string | null;
  review_result: string | null;
  created_at: string;
  updated_at: string | null;
};

/* ------------------------------------------------------------------ */
/* embedding 与检索                                                    */
/* ------------------------------------------------------------------ */

/** embedding 维度统计。 */
export type KbEmbeddingStats = {
  total: number;
  cardEmbeddings: number;
  chunkEmbeddings: number;
  minDims: number | null;
  maxDims: number | null;
  nullEmbeddings: number;
};

/** /api/kb/embed 返回。 */
export type KbEmbedResponse = {
  mode: "semantic" | "fallback_keyword";
  dims: number | null;
  embedding: number[] | null;
  warnings: string[];
};

/** /api/kb/search 请求。 */
export type KbSearchRequest = {
  q: string;
  mode: "semantic" | "keyword" | "hybrid";
  category?: string;
  sourceType?: string;
  targetType?: string;
  relatedChannel?: string;
  reviewStatus?: string;
  limit?: number;
  offset?: number;
};

/** /api/kb/search 单条结果。 */
export type KbSearchResult = {
  target_type: "knowledge_card" | "document_chunk";
  target_id: string;
  card_code: string | null;
  title: string;
  content_preview: string;
  source_type: string | null;
  category: string | null;
  related_channels: string[] | null;
  similarity: number | null;
  citation: string;
  needs_human_review: boolean;
  model_boundary: string | null;
};

/** /api/kb/search 响应。 */
export type KbSearchResponse = {
  mode: KbApiMode;
  query: string;
  retrievalMode: "semantic" | "keyword" | "hybrid" | "fallback_keyword" | "none";
  results: KbSearchResult[];
  total: number;
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* RAG 问答                                                            */
/* ------------------------------------------------------------------ */

export type KbCitation = {
  card_code: string;
  title: string;
  summary: string | null;
  source_type: string | null;
  category: string | null;
  similarity: number | null;
};

/** /api/kb/ask 响应。 */
export type KbAskResponse = {
  answer: string;
  citations: KbCitation[];
  retrieved: KbSearchResult[];
  warnings: string[];
  needsHumanReview: boolean;
  retrievalMode: KbSearchResponse["retrievalMode"];
  confidence: "high" | "medium" | "low" | "none";
  sourceCoverage: number;
};

/* ------------------------------------------------------------------ */
/* 总览 / 覆盖率                                                       */
/* ------------------------------------------------------------------ */

/** /api/kb/summary 响应。 */
export type KbSummary = {
  mode: KbApiMode;
  sourceDocumentCount: number;
  documentChunkCount: number;
  knowledgeCardCount: number;
  embeddingCount: number;
  relationCount: number;
  ruleCount: number;
  templateCount: number;
  reviewTaskCount: number;
  qaSessionCount: number;
  qaMessageCount: number;
  cardCategoryCounts: Record<string, number>;
  cardSourceTypeCounts: Record<string, number>;
  relationTypeCounts: Record<string, number>;
  ruleTypeCounts: Record<string, number>;
  templateTypeCounts: Record<string, number>;
  embeddingStats: KbEmbeddingStats;
  lastUpdatedAt: string | null;
  warnings: string[];
};

/** 单组通道覆盖（如 R01-R22）。 */
export type KbChannelGroupCoverage = {
  group: "R" | "B" | "S" | "C-R" | "C-B" | "C-S";
  label: string;
  total: number;
  covered: number;
  missing: string[];
  /** B 组固定为 true，前端据此渲染边界提示。 */
  isPhysicsConstrained: boolean;
};

/** /api/kb/coverage 响应。 */
export type KbCoverage = {
  mode: KbApiMode;
  realtimeIndicators: KbChannelGroupCoverage; // R01-R22
  physicsConstrained: KbChannelGroupCoverage; // B01-B41
  staticRisks: KbChannelGroupCoverage; // S01-S32
  controlR: KbChannelGroupCoverage; // C-R01..C-R22
  controlB: KbChannelGroupCoverage; // C-B01..C-B41
  controlS: KbChannelGroupCoverage; // C-S01..C-S32
  alarmThresholdRuleCount: number;
  alarmThresholdRuleCoverage: number; // 0-1
  disposalFlowRuleCount: number;
  disposalFlowCoverage: number; // 0-1
  sourceDocumentsByType: Record<string, number>;
  reviewTasksByReason: Record<string, number>;
  /** B01-B41 边界硬提示，后端固定下发。 */
  bBoundaryWarning: string;
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* 通用列表响应包装                                                    */
/* ------------------------------------------------------------------ */

export type KbListResponse<T> = {
  mode: KbApiMode;
  total: number;
  data: T[];
  warnings: string[];
};
