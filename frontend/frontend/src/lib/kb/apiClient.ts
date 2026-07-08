/**
 * 前端知识中枢 API 客户端（浏览器安全）
 *
 * 仅通过 fetch /api/kb/* 间接访问数据，绝不直接持有 Supabase key。
 * 所有方法返回统一信封 { data, mode, warnings, total? }。
 */

import type {
  KbSummary,
  KbCoverage,
  KbSearchResponse,
  KbAskResponse,
  KbSourceDocument,
  KbDocumentChunk,
  KbKnowledgeCard,
  KbRelation,
  KbRule,
  KbTemplate,
  KbReviewTask,
  KbApiMode,
  KbEmbedResponse,
  KbSearchRequest,
} from "@/types/kb";

export type KbEnvelope<T> = {
  data: T;
  mode: KbApiMode;
  warnings: string[];
  total?: number;
};

export class KbApiError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "KbApiError";
  }
}

async function kbFetch<T>(path: string, init?: RequestInit): Promise<KbEnvelope<T>> {
  const res = await fetch(path, { ...init, cache: "no-store" });
  const payload = (await res.json()) as Partial<KbEnvelope<T>> & { error?: string };
  if (!res.ok) {
    throw new KbApiError(payload.error ?? "知识库接口不可用", res.status);
  }
  return payload as KbEnvelope<T>;
}

function withPaging(base: string, limit?: number, offset?: number): string {
  const p = new URLSearchParams();
  if (limit !== undefined) p.set("limit", String(limit));
  if (offset !== undefined) p.set("offset", String(offset));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export const kbApi = {
  summary: () => kbFetch<KbSummary>("/api/kb/summary"),
  coverage: () => kbFetch<KbCoverage>("/api/kb/coverage"),
  sources: (limit = 100, offset = 0) =>
    kbFetch<KbSourceDocument[]>(withPaging("/api/kb/sources", limit, offset)),
  chunks: (limit = 100, offset = 0) =>
    kbFetch<KbDocumentChunk[]>(withPaging("/api/kb/chunks", limit, offset)),
  cards: (limit = 200, offset = 0) =>
    kbFetch<KbKnowledgeCard[]>(withPaging("/api/kb/cards", limit, offset)),
  relations: (limit = 500, offset = 0) =>
    kbFetch<KbRelation[]>(withPaging("/api/kb/relations", limit, offset)),
  rules: (limit = 200, offset = 0) =>
    kbFetch<KbRule[]>(withPaging("/api/kb/rules", limit, offset)),
  templates: (limit = 50, offset = 0) =>
    kbFetch<KbTemplate[]>(withPaging("/api/kb/templates", limit, offset)),
  reviewTasks: (limit = 300, offset = 0) =>
    kbFetch<KbReviewTask[]>(withPaging("/api/kb/review-tasks", limit, offset)),
  search: (req: KbSearchRequest) => {
    const p = new URLSearchParams();
    p.set("q", req.q);
    p.set("mode", req.mode);
    if (req.category) p.set("category", req.category);
    if (req.sourceType) p.set("sourceType", req.sourceType);
    if (req.targetType) p.set("targetType", req.targetType);
    if (req.relatedChannel) p.set("relatedChannel", req.relatedChannel);
    if (req.reviewStatus) p.set("reviewStatus", req.reviewStatus);
    if (req.limit !== undefined) p.set("limit", String(req.limit));
    if (req.offset !== undefined) p.set("offset", String(req.offset));
    return kbFetch<KbSearchResponse>(`/api/kb/search?${p.toString()}`);
  },
  ask: (question: string) =>
    kbFetch<KbAskResponse>("/api/kb/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    }),
  embed: (q: string) => kbFetch<KbEmbedResponse>(`/api/kb/embed?q=${encodeURIComponent(q)}`),
};
