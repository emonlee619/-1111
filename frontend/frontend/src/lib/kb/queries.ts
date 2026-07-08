/**
 * Stage 3 知识中枢 Supabase 查询层
 *
 * 所有函数均为服务端调用，封装对 source_documents / document_chunks /
 * knowledge_cards / knowledge_relations / knowledge_rules / knowledge_templates /
 * knowledge_review_tasks / knowledge_embeddings 的 REST 查询与轻量聚合。
 */

import { kbRest, kbCount } from "./supabaseServer";
import type {
  KbSourceDocument,
  KbDocumentChunk,
  KbKnowledgeCard,
  KbRelation,
  KbRule,
  KbTemplate,
  KbReviewTask,
} from "@/types/kb";

/** 带 filter 的行数统计（用 Prefer: count=exact）。filter 形如 "target_type=eq.knowledge_card"。 */
export async function countWhere(table: string, filter?: string): Promise<number> {
  const config = (await import("./supabaseServer")).getSupabaseConfig();
  if (!config) return 0;
  const path = filter ? `${table}?select=id&limit=1&${filter}` : `${table}?select=id&limit=1`;
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: "application/json",
      prefer: "count=exact",
    },
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const range = response.headers.get("content-range");
  if (!range) return 0;
  const n = Number(range.split("/")[1]);
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- source_documents ---------------- */

export async function listSourceDocuments(limit = 100, offset = 0): Promise<KbSourceDocument[]> {
  return kbRest<KbSourceDocument[]>(
    `source_documents?select=id,title,doc_type,storage_bucket,storage_path,file_name,file_ext,file_size,source_org,publish_year,version,description,status,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- document_chunks ---------------- */

export async function listDocumentChunks(limit = 100, offset = 0): Promise<KbDocumentChunk[]> {
  return kbRest<KbDocumentChunk[]>(
    `document_chunks?select=id,source_document_id,chunk_index,section_path,content,token_count,created_at&order=created_at.asc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- knowledge_cards ---------------- */

const CARD_SELECT =
  "id,card_code,title,category,source_type,summary,full_content,related_channels,related_risks,related_locations,physical_meaning,abnormal_signs,verification_actions,control_measures,legal_basis,threshold_rules,risk_level,reliability_weight,model_boundary,human_review_policy,source_document_ids,chunk_ids,confidence_level,needs_human_review,status,version,created_at,updated_at";

export async function listKnowledgeCards(limit = 200, offset = 0): Promise<KbKnowledgeCard[]> {
  return kbRest<KbKnowledgeCard[]>(
    `knowledge_cards?select=${CARD_SELECT}&status=eq.published&order=card_code.asc&limit=${limit}&offset=${offset}`,
  );
}

export async function listAllCardsLite(): Promise<
  Pick<KbKnowledgeCard, "id" | "card_code" | "title" | "category" | "source_type" | "summary" | "model_boundary" | "needs_human_review" | "related_channels" | "risk_level">[]
> {
  return kbRest(
    `knowledge_cards?select=id,card_code,title,category,source_type,summary,model_boundary,needs_human_review,related_channels,risk_level&status=eq.published&order=card_code.asc&limit=500`,
  );
}

/* ---------------- knowledge_relations ---------------- */

export async function listRelations(limit = 500, offset = 0): Promise<KbRelation[]> {
  return kbRest<KbRelation[]>(
    `knowledge_relations?select=id,source_card_code,target_card_code,relation_type,description,confidence_level,created_at&order=created_at.asc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- knowledge_rules ---------------- */

export async function listRules(limit = 200, offset = 0): Promise<KbRule[]> {
  return kbRest<KbRule[]>(
    `knowledge_rules?select=id,rule_code,title,rule_type,applies_to_channels,condition_json,action_json,legal_basis,boundary_notes,requires_human_review,status,version,created_at&status=eq.published&order=rule_code.asc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- knowledge_templates ---------------- */

export async function listTemplates(limit = 50, offset = 0): Promise<KbTemplate[]> {
  return kbRest<KbTemplate[]>(
    `knowledge_templates?select=id,template_code,title,template_type,trigger_source_type,related_channels,fields_schema,default_content,status,version,created_at&status=eq.published&order=template_code.asc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- knowledge_review_tasks ---------------- */

export async function listReviewTasks(limit = 300, offset = 0): Promise<KbReviewTask[]> {
  return kbRest<KbReviewTask[]>(
    `knowledge_review_tasks?select=id,target_type,target_id,card_code,review_status,review_reason,reviewer,review_result,created_at,updated_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
  );
}

/* ---------------- knowledge_embeddings（轻量探测） ---------------- */

type EmbeddingProbe = {
  target_type: string;
  embedding: number[] | null;
};

/** 拉 embedding 表的 target_type 与少量 embedding 样本，用于维度统计。 */
export async function probeEmbeddings(sample = 3): Promise<EmbeddingProbe[]> {
  return kbRest<EmbeddingProbe[]>(
    `knowledge_embeddings?select=target_type,embedding&limit=${Math.max(sample, 1)}`,
  );
}

/* ---------------- 计数快捷方法 ---------------- */

export const counts = {
  sourceDocuments: () => kbCount("source_documents"),
  documentChunks: () => kbCount("document_chunks"),
  knowledgeCards: () => countWhere("knowledge_cards", "status=eq.published"),
  knowledgeEmbeddings: () => kbCount("knowledge_embeddings"),
  knowledgeRelations: () => kbCount("knowledge_relations"),
  knowledgeRules: () => countWhere("knowledge_rules", "status=eq.published"),
  knowledgeTemplates: () => countWhere("knowledge_templates", "status=eq.published"),
  knowledgeReviewTasks: () => kbCount("knowledge_review_tasks"),
};

/* ---------------- 聚合工具 ---------------- */

/** 对字符串字段做分组计数。 */
export function groupCount<T>(rows: T[], picker: (row: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = picker(row) ?? "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
