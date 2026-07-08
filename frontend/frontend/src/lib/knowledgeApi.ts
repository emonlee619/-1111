export class KnowledgeApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "KnowledgeApiError";
  }
}

export type KnowledgeStats = {
  total_indicators: number;
  dynamic_indicators: number;
  static_indicators: number;
  total_rules: number;
  total_measures: number;
  total_cases: number;
  total_standards: number;
  total_clauses: number;
  total_version_records: number;
};

export type KnowledgePgStatus = {
  connected: boolean;
  available: boolean;
  project_ref: string;
  source: "supabase";
};

export type IndicatorFilter = {
  keyword?: string;
  indicator_type?: string;
  category?: string;
};

export type KnowledgeIndicator = {
  id: string;
  name: string;
  type?: string;
  category?: string;
  risk_level?: string;
  threshold?: string;
  symbol?: string;
  region?: string;
  description?: string;
};

export type KnowledgeRule = {
  id?: string;
  rule_id?: string;
  hazard_id?: string;
  hazard_name?: string;
  attribute?: string;
  suggested_risk_level?: string;
};

export type KnowledgeMeasure = {
  id: string;
  content: string;
  source?: string;
};

export type KnowledgeAiAnswer = {
  answer: string;
  mode: string;
  evidence_count: number;
  warning?: string;
  citations: Array<{ id: string; title: string; content: string; source_type: string }>;
  structured_query?: { terms?: string[] };
};

export type KnowledgeNlQueryResult = {
  intent: string;
  count: number;
  message?: string;
  results: Array<Record<string, string | number | boolean | null>>;
  counts?: Record<string, number>;
  citations?: KnowledgeAiAnswer["citations"];
  warnings?: string[];
};

type KbCard = {
  id: string;
  card_code: string;
  title: string;
  category: string;
  source_type: string | null;
  summary: string | null;
  related_channels: string[] | null;
  model_boundary: string | null;
  risk_level?: string | null;
};

type KbRule = {
  id: string;
  rule_code: string;
  title: string;
  rule_type: string;
  applies_to_channels: string[] | null;
  boundary_notes: string | null;
};

async function kbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/kb/${path}`, { ...init, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new KnowledgeApiError(payload.error ?? "知识库接口不可用", response.status);
  }
  return payload.data as T;
}

async function getSummary() {
  return kbFetch<{
    counts: Record<string, number>;
    cards: KbCard[];
    rules: KbRule[];
    templates: Array<{ id: string; template_code: string; title: string; template_type: string }>;
  }>("summary");
}

export function riskLabel(value?: string | null) {
  if (!value) return "待复核";
  const lower = value.toLowerCase();
  if (lower.includes("critical") || lower.includes("重大") || lower.includes("red")) return "重大";
  if (lower.includes("high") || lower.includes("高")) return "高";
  if (lower.includes("medium") || lower.includes("中")) return "中";
  if (lower.includes("low") || lower.includes("低")) return "低";
  return value;
}

export function riskTone(value?: string | null) {
  const label = riskLabel(value);
  if (label === "重大" || label === "高") return "danger";
  if (label === "中") return "warning";
  if (label === "低") return "success";
  return "neutral";
}

export async function fetchCategories() {
  const summary = await getSummary();
  return Array.from(new Set(summary.cards.map((card) => card.category))).sort();
}

export async function fetchRegions() {
  return ["全矿井", "采掘工作面", "通风系统", "抽采系统"];
}

export async function fetchHighRiskIndicators(): Promise<KnowledgeIndicator[]> {
  const summary = await getSummary();
  return summary.cards
    .filter((card) => card.source_type === "physics_constrained" || card.category === "ai_guardrail")
    .map(cardToIndicator);
}

export async function fetchStats(): Promise<KnowledgeStats> {
  const summary = await getSummary();
  const cards = summary.cards;
  return {
    total_indicators: 63,
    dynamic_indicators: 63,
    static_indicators: 0,
    total_rules: summary.counts.published_rules ?? summary.rules.length,
    total_measures: summary.rules.length,
    total_cases: cards.filter((card) => card.category === "cause_chain").length,
    total_standards: cards.filter((card) => card.source_type === "legal_standard").length,
    total_clauses: cards.length,
    total_version_records: summary.templates.length,
  };
}

export async function fetchPgStatus(): Promise<KnowledgePgStatus> {
  await getSummary();
  return { connected: true, available: true, project_ref: "uwyguflrwqsnbrqrgesa", source: "supabase" };
}

export async function fetchIndicators(filter: IndicatorFilter = {}): Promise<KnowledgeIndicator[]> {
  const query = filter.keyword?.trim();
  const cards = query ? await kbFetch<KbCard[]>(`search?q=${encodeURIComponent(query)}`) : (await getSummary()).cards;
  return cards
    .filter((card) => {
      if (filter.category && card.category !== filter.category) return false;
      if (filter.indicator_type === "动态") return card.related_channels?.some((channel) => channel.includes("R") || channel.includes("B")) ?? false;
      if (filter.indicator_type === "静态") return card.category === "static_risk";
      return true;
    })
    .map(cardToIndicator);
}

export async function fetchRules(): Promise<KnowledgeRule[]> {
  const summary = await getSummary();
  return summary.rules.map((rule) => ({
    id: rule.id,
    rule_id: rule.rule_code,
    hazard_id: rule.rule_type,
    hazard_name: rule.title,
    attribute: rule.boundary_notes ?? "Supabase 规则",
    suggested_risk_level: rule.rule_type.includes("human") ? "high" : "medium",
  }));
}

export async function fetchMeasures(): Promise<KnowledgeMeasure[]> {
  const summary = await getSummary();
  return summary.rules.map((rule) => ({
    id: rule.rule_code,
    content: rule.boundary_notes ?? rule.title,
    source: "knowledge_rules",
  }));
}

export async function fetchAiAnswer(question: string): Promise<KnowledgeAiAnswer> {
  const data = await kbFetch<{
    answer: string;
    citations: Array<{ card_code: string; title: string; summary: string | null; source_type: string | null }>;
    warnings: string[];
  }>("ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return {
    answer: data.answer,
    mode: "supabase:evidence",
    evidence_count: data.citations.length,
    warning: data.warnings[0],
    citations: data.citations.map((item) => ({
      id: item.card_code,
      title: item.title,
      content: item.summary ?? "",
      source_type: item.source_type ?? "unknown",
    })),
    structured_query: { terms: question.split(/\s+/).filter(Boolean).slice(0, 8) },
  };
}

export async function fetchNlQuery(question: string): Promise<KnowledgeNlQueryResult> {
  const answer = await fetchAiAnswer(question);
  return {
    intent: "supabase_rag",
    count: answer.citations.length,
    message: answer.answer,
    results: answer.citations.map((item) => ({
      id: item.id,
      title: item.title,
      source_type: item.source_type,
      content: item.content,
    })),
    counts: {
      citations: answer.citations.length,
      warnings: answer.warning ? 1 : 0,
    },
    citations: answer.citations,
    warnings: answer.warning ? [answer.warning] : [],
  };
}

function cardToIndicator(card: KbCard): KnowledgeIndicator {
  return {
    id: card.card_code,
    name: card.title,
    type: card.source_type ?? card.category,
    category: card.category,
    risk_level: card.source_type === "physics_constrained" ? "high" : "medium",
    threshold: card.model_boundary ?? card.related_channels?.join(", "),
    symbol: card.related_channels?.[0],
    region: card.related_channels?.join(", "),
    description: card.summary ?? undefined,
  };
}
