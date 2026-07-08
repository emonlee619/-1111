/**
 * Stage 3 知识检索：semantic / keyword / hybrid
 *
 * - semantic：embedQuery → Supabase RPC match_knowledge_embeddings → hydrate
 * - keyword：knowledge_cards / document_chunks 的 ILIKE 全文检索
 * - hybrid：先语义，再用关键词补足，按 card_code 去重
 * - 任意语义失败自动 fallback 到关键词，绝不抛错到页面。
 */

import { kbRest, kbRpc } from "./supabaseServer";
import { embedQuery } from "./embed";
import type {
  KbSearchRequest,
  KbSearchResponse,
  KbSearchResult,
  KbApiMode,
  KbKnowledgeCard,
} from "@/types/kb";

const CARD_LITE =
  "id,card_code,title,category,source_type,summary,full_content,related_channels,model_boundary,needs_human_review";

/** 清洗查询串：去掉 PostgREST 特殊字符，保留中文/字母数字。 */
function sanitize(q: string): string {
  return q
    .replace(/[,:*%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type RpcMatch = {
  id?: string;
  target_type?: string;
  target_id?: string;
  card_code?: string | null;
  content?: string | null;
  similarity?: number;
  metadata?: Record<string, unknown> | null;
};

type CardLite = Pick<
  KbKnowledgeCard,
  | "id"
  | "card_code"
  | "title"
  | "category"
  | "source_type"
  | "summary"
  | "full_content"
  | "related_channels"
  | "model_boundary"
  | "needs_human_review"
>;

function toResult(card: CardLite, similarity: number | null): KbSearchResult {
  const preview = (card.summary ?? card.full_content ?? "").slice(0, 160);
  return {
    target_type: "knowledge_card",
    target_id: card.id,
    card_code: card.card_code,
    title: card.title,
    content_preview: preview,
    source_type: card.source_type ?? null,
    category: card.category ?? null,
    related_channels: card.related_channels ?? null,
    similarity,
    citation: `[${card.card_code}] ${card.title}`,
    needs_human_review: Boolean(card.needs_human_review),
    model_boundary: card.model_boundary ?? null,
  };
}

function chunkToResult(
  chunk: { id: string; content: string; section_path: string | null; source_document_id: string },
  similarity: number | null,
): KbSearchResult {
  return {
    target_type: "document_chunk",
    target_id: chunk.id,
    card_code: null,
    title: chunk.section_path ?? "文档切片",
    content_preview: chunk.content.slice(0, 200),
    source_type: "legal_standard",
    category: null,
    related_channels: null,
    similarity,
    citation: chunk.section_path ? `文档切片 / ${chunk.section_path}` : "文档切片",
    needs_human_review: false,
    model_boundary: null,
  };
}

/** 语义检索：embedding + RPC + hydrate。 */
async function semanticSearch(
  q: string,
  limit: number,
): Promise<{ results: KbSearchResult[]; retrievalMode: KbSearchResponse["retrievalMode"]; warnings: string[] }> {
  const warnings: string[] = [];
  const embed = await embedQuery(q);
  warnings.push(...embed.warnings);
  if (embed.mode !== "semantic" || !embed.embedding) {
    return { results: [], retrievalMode: "fallback_keyword", warnings };
  }
  let matches: RpcMatch[] = [];
  try {
    matches = await kbRpc<RpcMatch[]>("match_knowledge_embeddings", {
      query_embedding: embed.embedding,
      match_threshold: 0.12,
      match_count: Math.max(limit, 8),
      filter_metadata: {},
    });
  } catch (err) {
    warnings.push(
      `match_knowledge_embeddings RPC 不可用：${err instanceof Error ? err.message : String(err)}，降级关键词检索。`,
    );
    return { results: [], retrievalMode: "fallback_keyword", warnings };
  }
  // 收集 card_code 与 chunk target_id
  const cardCodes = new Set<string>();
  const chunkIds = new Set<string>();
  for (const m of matches) {
    if (m.card_code) cardCodes.add(m.card_code);
    else if (m.target_type === "knowledge_card" && m.target_id) cardCodes.add(`__id__${m.target_id}`);
    if (m.target_type === "document_chunk" && m.target_id) chunkIds.add(m.target_id);
  }
  // 批量 hydrate 卡片
  const cardByCode = new Map<string, CardLite>();
  if (cardCodes.size > 0) {
    const codes = Array.from(cardCodes).filter((c) => !c.startsWith("__id__"));
    if (codes.length > 0) {
      try {
        const cards = await kbRest<CardLite[]>(
          `knowledge_cards?select=${CARD_LITE}&status=eq.published&card_code=in.(${codes
            .map(encodeURIComponent)
            .join(",")})`,
        );
        for (const c of cards) cardByCode.set(c.card_code, c);
      } catch {
        warnings.push("语义结果卡片 hydrate 失败，部分结果可能缺失标题。");
      }
    }
  }
  // 批量 hydrate chunks
  const chunkById = new Map<string, { id: string; content: string; section_path: string | null; source_document_id: string }>();
  if (chunkIds.size > 0) {
    try {
      const chunks = await kbRest(
        `document_chunks?select=id,source_document_id,content,section_path&limit=50`,
      );
      for (const c of chunks as Array<{ id: string; content: string; section_path: string | null; source_document_id: string }>) {
        if (chunkIds.has(c.id)) chunkById.set(c.id, c);
      }
    } catch {
      warnings.push("语义结果文档切片 hydrate 失败。");
    }
  }
  const results: KbSearchResult[] = [];
  for (const m of matches) {
    const sim = typeof m.similarity === "number" ? m.similarity : null;
    if (m.target_type === "document_chunk" && m.target_id) {
      const chunk = chunkById.get(m.target_id);
      if (chunk) results.push(chunkToResult(chunk, sim));
      continue;
    }
    const code = m.card_code ?? null;
    const card = code ? cardByCode.get(code) : null;
    if (card) results.push(toResult(card, sim));
  }
  return { results, retrievalMode: "semantic", warnings };
}

/** 关键词检索：cards ILIKE + chunks ILIKE。 */
async function keywordSearch(
  q: string,
  limit: number,
  filters: { category?: string; sourceType?: string; targetType?: string; relatedChannel?: string },
): Promise<{ results: KbSearchResult[]; warnings: string[] }> {
  const warnings: string[] = [];
  const safe = sanitize(q);
  const results: KbSearchResult[] = [];
  const wantChunks = !filters.targetType || filters.targetType === "document_chunk";
  const wantCards = !filters.targetType || filters.targetType === "knowledge_card";

  if (wantCards) {
    const orParts = ["title", "summary", "full_content"]
      .map((f) => `${f}.ilike.*${encodeURIComponent(safe)}*`)
      .join(",");
    let path = `knowledge_cards?select=${CARD_LITE}&status=eq.published&or=(${orParts})`;
    if (filters.category) path += `&category=eq.${encodeURIComponent(filters.category)}`;
    if (filters.sourceType) path += `&source_type=eq.${encodeURIComponent(filters.sourceType)}`;
    if (filters.relatedChannel) path += `&related_channels=cs.{${encodeURIComponent(filters.relatedChannel)}}`;
    path += `&limit=${limit}`;
    try {
      const cards = await kbRest<CardLite[]>(path);
      for (const c of cards) results.push(toResult(c, null));
    } catch (err) {
      warnings.push(`卡片关键词检索失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (wantChunks && safe) {
    const path = `document_chunks?select=id,source_document_id,content,section_path&or=(content.ilike.*${encodeURIComponent(safe)}*,section_path.ilike.*${encodeURIComponent(safe)}*)&limit=${Math.min(limit, 30)}`;
    try {
      const chunks = await kbRest<
        Array<{ id: string; content: string; section_path: string | null; source_document_id: string }>
      >(path);
      for (const c of chunks) results.push(chunkToResult(c, null));
    } catch (err) {
      warnings.push(`文档切片关键词检索失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { results, warnings };
}

/** 主检索入口。 */
export async function searchKb(
  req: KbSearchRequest,
  mode: KbApiMode,
): Promise<KbSearchResponse> {
  const limit = Math.min(Math.max(req.limit ?? 20, 1), 80);
  const q = (req.q ?? "").trim();
  const filters = {
    category: req.category,
    sourceType: req.sourceType,
    targetType: req.targetType,
    relatedChannel: req.relatedChannel,
  };
  const warnings: string[] = [];
  const wantMode = req.mode ?? "hybrid";

  if (!q) {
    return { mode, query: q, retrievalMode: "none", results: [], total: 0, warnings: ["查询为空。"] };
  }

  let results: KbSearchResult[] = [];
  let retrievalMode: KbSearchResponse["retrievalMode"] = "none";

  if (wantMode === "semantic" || wantMode === "hybrid") {
    const sem = await semanticSearch(q, limit);
    warnings.push(...sem.warnings);
    results.push(...sem.results);
    retrievalMode = sem.retrievalMode;
  }

  if (wantMode === "keyword" || retrievalMode === "fallback_keyword" || (wantMode === "hybrid" && results.length < limit)) {
    const kw = await keywordSearch(q, limit, filters);
    warnings.push(...kw.warnings);
    if (retrievalMode === "none") retrievalMode = "keyword";
    else if (retrievalMode === "fallback_keyword") retrievalMode = "fallback_keyword";
    else if (wantMode === "hybrid") retrievalMode = "hybrid";
    // 去重：优先保留已有（语义）结果，关键词结果按 card_code/target_id 去重
    const seen = new Set(results.map((r) => r.card_code ?? r.target_id));
    for (const r of kw.results) {
      const key = r.card_code ?? r.target_id;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  }

  // 排序：有 similarity 的靠前
  results.sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1));
  results = results.slice(0, limit);

  return { mode, query: q, retrievalMode, results, total: results.length, warnings };
}
