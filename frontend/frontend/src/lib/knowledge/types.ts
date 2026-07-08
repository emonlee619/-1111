export type KnowledgeCategory =
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

export type KnowledgeSourceType =
  | "real_sensor"
  | "physics_constrained"
  | "static_prior"
  | "manual_check"
  | "legal_standard"
  | "system_rule"
  | "unknown";

export type KnowledgeCard = {
  id: string;
  card_code: string;
  title: string;
  category: KnowledgeCategory;
  source_type: KnowledgeSourceType | null;
  summary: string | null;
  full_content?: string | null;
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

export type KnowledgeRelation = {
  id: string;
  source_card_code: string;
  target_card_code: string;
  relation_type: string;
  description: string | null;
  confidence_level: string | null;
  created_at: string;
};

export type KnowledgeRule = {
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

export type KnowledgeTemplate = {
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

export type KnowledgeReviewTask = {
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

export type KnowledgeSearchParams = {
  q?: string;
  category?: string;
  source_type?: string;
  channel?: string;
  risk?: string;
  limit?: number;
};

export type Citation = {
  card_code: string;
  title: string;
  summary: string | null;
  source_type: string | null;
  category?: string | null;
};

export type RagAnswer = {
  answer: string;
  citations: Citation[];
  warnings: string[];
  retrieved_cards: KnowledgeCard[];
};

export type KnowledgeGraph = {
  nodes: Array<{ id: string; label: string; type: string; source_type?: string | null }>;
  edges: Array<{ id: string; source: string; target: string; relation_type: string; label: string }>;
};

export type KnowledgeStats = {
  cards: number;
  rules: number;
  templates: number;
  review_tasks: number;
  pending_reviews: number;
  source_documents: number;
  document_chunks: number;
  embeddings: number;
  reports: number;
  latest_card_update: string | null;
  versions: string[];
  import_status: string;
};
