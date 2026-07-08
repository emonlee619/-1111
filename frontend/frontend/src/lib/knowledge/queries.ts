import { supabaseRest } from "@/lib/supabase/server";
import type {
  KnowledgeCard,
  KnowledgeGraph,
  KnowledgeRelation,
  KnowledgeReviewTask,
  KnowledgeRule,
  KnowledgeSearchParams,
  KnowledgeStats,
  KnowledgeTemplate,
} from "./types";

const cardSelect =
  "id,card_code,title,category,source_type,summary,full_content,related_channels,related_risks,related_locations,physical_meaning,abnormal_signs,verification_actions,control_measures,legal_basis,threshold_rules,risk_level,reliability_weight,model_boundary,human_review_policy,source_document_ids,chunk_ids,confidence_level,needs_human_review,status,version,created_at,updated_at";

function enc(value: string) {
  return encodeURIComponent(value);
}

function parseLimit(value?: number, fallback = 30) {
  const limit = Number(value ?? fallback);
  return Math.max(1, Math.min(Number.isFinite(limit) ? limit : fallback, 100));
}

export async function searchKnowledgeCards(params: KnowledgeSearchParams = {}) {
  const limit = parseLimit(params.limit);
  const filters = [`select=${cardSelect}`, "status=eq.published", `limit=${limit}`, "order=card_code.asc"];

  if (params.category) filters.push(`category=eq.${enc(params.category)}`);
  if (params.source_type) filters.push(`source_type=eq.${enc(params.source_type)}`);
  if (params.risk) filters.push(`risk_level=eq.${enc(params.risk)}`);
  if (params.channel) filters.push(`related_channels=cs.{${enc(params.channel)}}`);

  const q = params.q?.trim();
  if (q) {
    const term = enc(`*${q.replace(/[(),]/g, " ")}*`);
    filters.push(`or=(card_code.ilike.${term},title.ilike.${term},summary.ilike.${term},full_content.ilike.${term})`);
  }

  return supabaseRest<KnowledgeCard[]>(`knowledge_cards?${filters.join("&")}`);
}

export async function getKnowledgeCard(cardCode: string) {
  const rows = await supabaseRest<KnowledgeCard[]>(
    `knowledge_cards?select=${cardSelect}&card_code=eq.${enc(cardCode)}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getKnowledgeRelations(cardCode: string) {
  return supabaseRest<KnowledgeRelation[]>(
    `knowledge_relations?select=*&or=(source_card_code.eq.${enc(cardCode)},target_card_code.eq.${enc(cardCode)})&order=created_at.desc`,
  );
}

export async function listKnowledgeRules(params: { channel?: string; rule_type?: string; limit?: number } = {}) {
  const filters = ["select=*", "status=eq.published", `limit=${parseLimit(params.limit, 80)}`, "order=rule_code.asc"];
  if (params.rule_type) filters.push(`rule_type=eq.${enc(params.rule_type)}`);
  if (params.channel) filters.push(`applies_to_channels=cs.{${enc(params.channel)}}`);
  return supabaseRest<KnowledgeRule[]>(`knowledge_rules?${filters.join("&")}`);
}

export async function listKnowledgeTemplates(params: { trigger_source_type?: string; limit?: number } = {}) {
  const filters = ["select=*", "status=eq.published", `limit=${parseLimit(params.limit, 80)}`, "order=template_code.asc"];
  if (params.trigger_source_type) filters.push(`trigger_source_type=eq.${enc(params.trigger_source_type)}`);
  return supabaseRest<KnowledgeTemplate[]>(`knowledge_templates?${filters.join("&")}`);
}

export async function listReviewItems() {
  const [cards, tasks] = await Promise.all([
    supabaseRest<KnowledgeCard[]>(`knowledge_cards?select=${cardSelect}&needs_human_review=eq.true&order=updated_at.desc&limit=100`, {
      useServiceRole: true,
    }),
    supabaseRest<KnowledgeReviewTask[]>("knowledge_review_tasks?select=*&order=created_at.desc&limit=100", {
      useServiceRole: true,
    }),
  ]);
  return { cards, tasks };
}

async function countRows(table: string, extra = "") {
  const path = `${table}?select=id&limit=1000${extra}`;
  const rows = await supabaseRest<Array<{ id: string }>>(path, { useServiceRole: true });
  return rows.length;
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const [cards, rules, templates, reviewTasks, pendingReviews, sourceDocuments, chunks, embeddings, reports, latestRows] =
    await Promise.all([
      countRows("knowledge_cards"),
      countRows("knowledge_rules"),
      countRows("knowledge_templates"),
      countRows("knowledge_review_tasks"),
      countRows("knowledge_review_tasks", "&review_status=eq.pending"),
      countRows("source_documents"),
      countRows("document_chunks"),
      countRows("knowledge_embeddings"),
      countRows("report_generation_records"),
      supabaseRest<Array<{ updated_at: string | null; version: string | null }>>(
        "knowledge_cards?select=updated_at,version&order=updated_at.desc&limit=100",
        { useServiceRole: true },
      ),
    ]);

  const versions = Array.from(new Set(latestRows.map((row) => row.version).filter(Boolean))) as string[];
  return {
    cards,
    rules,
    templates,
    review_tasks: reviewTasks,
    pending_reviews: pendingReviews,
    source_documents: sourceDocuments,
    document_chunks: chunks,
    embeddings,
    reports,
    latest_card_update: latestRows[0]?.updated_at ?? null,
    versions,
    import_status: sourceDocuments > 0 && chunks > 0 ? "documents_imported" : "waiting_for_stage2_import",
  };
}

export async function getKnowledgeGraph(limit = 80): Promise<KnowledgeGraph> {
  const [cards, relations] = await Promise.all([
    searchKnowledgeCards({ limit }),
    supabaseRest<KnowledgeRelation[]>(`knowledge_relations?select=*&limit=${parseLimit(limit, 80)}&order=created_at.desc`),
  ]);
  const nodeMap = new Map<string, KnowledgeGraph["nodes"][number]>();
  for (const card of cards) {
    nodeMap.set(card.card_code, {
      id: card.card_code,
      label: card.title,
      type: card.category,
      source_type: card.source_type,
    });
  }
  for (const relation of relations) {
    if (!nodeMap.has(relation.source_card_code)) {
      nodeMap.set(relation.source_card_code, { id: relation.source_card_code, label: relation.source_card_code, type: "unknown" });
    }
    if (!nodeMap.has(relation.target_card_code)) {
      nodeMap.set(relation.target_card_code, { id: relation.target_card_code, label: relation.target_card_code, type: "unknown" });
    }
  }
  return {
    nodes: Array.from(nodeMap.values()),
    edges: relations.map((relation) => ({
      id: relation.id,
      source: relation.source_card_code,
      target: relation.target_card_code,
      relation_type: relation.relation_type,
      label: relation.description ?? relation.relation_type,
    })),
  };
}

export async function insertReportRecord(input: {
  report_type: string;
  title: string;
  input_payload: Record<string, unknown>;
  generated_content: string;
  citations: unknown[];
}) {
  const rows = await supabaseRest<Array<{ id: string }>>("report_generation_records?select=id", {
    method: "POST",
    useServiceRole: true,
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ ...input, status: "draft" }),
  });
  return rows[0]?.id ?? null;
}
