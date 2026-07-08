export type KbCard = {
  id: string;
  card_code: string;
  title: string;
  category: string;
  source_type: string | null;
  summary: string | null;
  related_channels: string[] | null;
  model_boundary: string | null;
  human_review_policy: string | null;
  needs_human_review: boolean;
  status: string;
};

export type KbRule = {
  id: string;
  rule_code: string;
  title: string;
  rule_type: string;
  applies_to_channels: string[] | null;
  boundary_notes: string | null;
  requires_human_review: boolean;
  status: string;
};

export type KbTemplate = {
  id: string;
  template_code: string;
  title: string;
  template_type: string;
  related_channels: string[] | null;
  fields_schema: Record<string, unknown>;
  default_content: Record<string, unknown>;
  status: string;
};

export type KbAnswer = {
  answer: string;
  citations: Array<{ card_code: string; title: string; summary: string | null; source_type: string | null }>;
  warnings: string[];
  retrieved_cards: KbCard[];
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export async function kbRest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 环境变量未配置：需要 SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL 和服务端 key。");
  }
  const headers = new Headers(init?.headers);
  headers.set("apikey", config.key);
  headers.set("authorization", `Bearer ${config.key}`);
  headers.set("accept", "application/json");
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function listKbCards(limit = 50) {
  return kbRest<KbCard[]>(
    `knowledge_cards?select=id,card_code,title,category,source_type,summary,related_channels,model_boundary,human_review_policy,needs_human_review,status&status=eq.published&order=card_code.asc&limit=${limit}`
  );
}

export async function listKbRules(limit = 50) {
  return kbRest<KbRule[]>(
    `knowledge_rules?select=id,rule_code,title,rule_type,applies_to_channels,boundary_notes,requires_human_review,status&status=eq.published&order=rule_code.asc&limit=${limit}`
  );
}

export async function listKbTemplates(limit = 50) {
  return kbRest<KbTemplate[]>(
    `knowledge_templates?select=id,template_code,title,template_type,related_channels,fields_schema,default_content,status&status=eq.published&order=template_code.asc&limit=${limit}`
  );
}

export async function searchKbCards(query: string) {
  const safeQuery = query.trim().replaceAll(",", " ").replaceAll(":", " ");
  if (!safeQuery) return listKbCards(20);
  return kbRest<KbCard[]>(
    `knowledge_cards?select=id,card_code,title,category,source_type,summary,related_channels,model_boundary,human_review_policy,needs_human_review,status&status=eq.published&or=(title.ilike.*${encodeURIComponent(safeQuery)}*,summary.ilike.*${encodeURIComponent(safeQuery)}*,full_content.ilike.*${encodeURIComponent(safeQuery)}*)&limit=20`
  );
}

export async function answerWithEvidence(question: string): Promise<KbAnswer> {
  const cards = await searchKbCards(question);
  const citations = cards.slice(0, 5).map((card) => ({
    card_code: card.card_code,
    title: card.title,
    summary: card.summary,
    source_type: card.source_type
  }));
  const warnings = [
    "AI 问答必须引用知识库证据；无证据时不得空口生成结论。",
    "重大隐患最终判定必须人工审核。",
    "B01-B41 为 physics_constrained，不能单独触发断电、撤人、执法结论或现场实测结论。"
  ];
  const answer =
    citations.length > 0
      ? `基于已发布知识卡，当前问题可先参考 ${citations.map((item) => item.card_code).join("、")}。系统只能提供证据链和复核建议，不能替代现场复核、调度研判或人工法规审核。`
      : "知识库未检索到可引用证据，因此不能生成确定性结论。请先导入法规、标准、案例或企业资料，并完成人工审核。";
  return { answer, citations, warnings, retrieved_cards: cards };
}
