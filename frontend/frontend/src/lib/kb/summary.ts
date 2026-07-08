/**
 * Stage 3 知识中枢总览聚合（含向后兼容字段）
 *
 * 汇总各表行数、分组计数、embedding 维度统计。
 * 返回 KbSummary + 兼容旧 knowledgeApi.ts 的 counts/cards/rules/templates。
 * qa_sessions / qa_messages 表当前未接入，固定返回 0 并给出 warning。
 */

import { counts, countWhere, listAllCardsLite, listRelations, listRules, listTemplates, probeEmbeddings, groupCount } from "./queries";
import type { KbSummary, KbEmbeddingStats, KbApiMode, KbKnowledgeCard, KbRule, KbTemplate } from "@/types/kb";

/** 旧 knowledgeApi.getSummary() 期望的兼容字段。 */
export type KbSummaryCompat = {
  counts: Record<string, number>;
  cards: Pick<KbKnowledgeCard, "id" | "card_code" | "title" | "category" | "source_type" | "summary" | "related_channels" | "model_boundary" | "risk_level">[];
  rules: Pick<KbRule, "id" | "rule_code" | "title" | "rule_type" | "applies_to_channels" | "boundary_notes">[];
  templates: Pick<KbTemplate, "id" | "template_code" | "title" | "template_type">[];
};

export async function buildSummary(mode: KbApiMode, baseWarnings: string[]): Promise<KbSummary & KbSummaryCompat> {
  const warnings = [...baseWarnings];

  const [
    sourceDocumentCount,
    documentChunkCount,
    knowledgeCardCount,
    embeddingCount,
    relationCount,
    ruleCount,
    templateCount,
    reviewTaskCount,
  ] = await Promise.all([
    counts.sourceDocuments().catch(() => 0),
    counts.documentChunks().catch(() => 0),
    counts.knowledgeCards().catch(() => 0),
    counts.knowledgeEmbeddings().catch(() => 0),
    counts.knowledgeRelations().catch(() => 0),
    counts.knowledgeRules().catch(() => 0),
    counts.knowledgeTemplates().catch(() => 0),
    counts.knowledgeReviewTasks().catch(() => 0),
  ]);

  // 分组统计（数据量小，拉取轻量字段后服务端聚合）
  const [cards, relations, rules, templates, embeddingSample] = await Promise.all([
    listAllCardsLite().catch(() => []),
    listRelations(500, 0).catch(() => []),
    listRules(200, 0).catch(() => []),
    listTemplates(50, 0).catch(() => []),
    probeEmbeddings(3).catch(() => []),
  ]);

  const cardCategoryCounts = groupCount(cards, (c) => c.category);
  const cardSourceTypeCounts = groupCount(cards, (c) => c.source_type);
  const relationTypeCounts = groupCount(relations, (r) => r.relation_type);
  const ruleTypeCounts = groupCount(rules, (r) => r.rule_type);
  const templateTypeCounts = groupCount(templates, (t) => t.template_type);

  // embedding 维度统计
  const dims = embeddingSample
    .map((e) => (Array.isArray(e.embedding) ? e.embedding.length : 0))
    .filter((d) => d > 0);
  const minDims = dims.length ? Math.min(...dims) : null;
  const maxDims = dims.length ? Math.max(...dims) : null;
  const nullEmbeddings = embeddingSample.filter((e) => !Array.isArray(e.embedding) || e.embedding.length === 0).length;

  const [cardEmbeddings, chunkEmbeddings] = await Promise.all([
    countWhere("knowledge_embeddings", "target_type=eq.knowledge_card").catch(() => 0),
    countWhere("knowledge_embeddings", "target_type=eq.document_chunk").catch(() => 0),
  ]);

  const embeddingStats: KbEmbeddingStats = {
    total: embeddingCount,
    cardEmbeddings,
    chunkEmbeddings,
    minDims,
    maxDims,
    nullEmbeddings,
  };

  if (minDims !== 384) {
    warnings.push(`embedding 维度探测为 ${minDims ?? "未知"}，Stage 2 预期为 384 维。`);
  }
  warnings.push("qa_sessions / qa_messages 暂未接入存储，相关计数为 0。");

  const lastUpdatedAt = cards.length > 0 ? new Date().toISOString() : null;

  // 兼容旧 knowledgeApi.ts 的 counts（键名保持一致）
  const compatCounts: Record<string, number> = {
    published_cards: knowledgeCardCount,
    published_rules: ruleCount,
    published_templates: templateCount,
    real_sensor_cards: cards.filter((c) => c.source_type === "real_sensor").length,
    physics_constrained_cards: cards.filter((c) => c.source_type === "physics_constrained").length,
    source_documents: sourceDocumentCount,
    document_chunks: documentChunkCount,
    embeddings: embeddingCount,
    relations: relationCount,
    review_tasks: reviewTaskCount,
  };

  const summary: KbSummary = {
    mode,
    sourceDocumentCount,
    documentChunkCount,
    knowledgeCardCount,
    embeddingCount,
    relationCount,
    ruleCount,
    templateCount,
    reviewTaskCount,
    qaSessionCount: 0,
    qaMessageCount: 0,
    cardCategoryCounts,
    cardSourceTypeCounts,
    relationTypeCounts,
    ruleTypeCounts,
    templateTypeCounts,
    embeddingStats,
    lastUpdatedAt,
    warnings,
  };

  return {
    ...summary,
    counts: compatCounts,
    cards,
    rules: rules.map((r) => ({
      id: r.id,
      rule_code: r.rule_code,
      title: r.title,
      rule_type: r.rule_type,
      applies_to_channels: r.applies_to_channels,
      boundary_notes: r.boundary_notes,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      template_code: t.template_code,
      title: t.title,
      template_type: t.template_type,
    })),
  };
}
