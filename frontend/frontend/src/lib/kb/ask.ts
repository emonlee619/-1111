/**
 * Stage 3 规则式 RAG 问答
 *
 * 当前不调用大模型，仅基于检索证据做规则式回答：
 * - 无引用不得输出确定结论
 * - 涉及断电/撤人/重大隐患/执法 → needsHumanReview=true
 * - 涉及 B01-B41 → 必须提示"仅辅助前兆，不是现场实测"
 */

import { searchKb } from "./search";
import type { KbAskResponse, KbApiMode, KbCitation } from "@/types/kb";

const POWER_KEYWORDS = ["断电", "撤人", "执法", "重大隐患", "停产", "刑事", "处罚"];
const B_PATTERN = /\bB\d{2}\b|B01-B41|物理约束/;

/** 判断问题是否触发人工复核。 */
export function needsReview(question: string, answer: string): boolean {
  const text = `${question} ${answer}`;
  if (B_PATTERN.test(question)) return true;
  return POWER_KEYWORDS.some((kw) => text.includes(kw));
}

/** 主问答入口。 */
export async function askKb(question: string, mode: KbApiMode): Promise<KbAskResponse> {
  const q = (question ?? "").trim();
  const warnings: string[] = [];

  if (!q) {
    return {
      answer: "问题为空，无法回答。",
      citations: [],
      retrieved: [],
      warnings: ["问题为空。"],
      needsHumanReview: false,
      retrievalMode: "none",
      confidence: "none",
      sourceCoverage: 0,
    };
  }

  const search = await searchKb({ q, mode: "hybrid", limit: 8 }, mode);
  warnings.push(...search.warnings);
  const retrieved = search.results;

  const citations: KbCitation[] = retrieved
    .filter((r) => r.card_code)
    .slice(0, 6)
    .map((r) => ({
      card_code: r.card_code as string,
      title: r.title,
      summary: r.content_preview ? r.content_preview.slice(0, 120) : null,
      source_type: r.source_type,
      category: r.category,
      similarity: r.similarity,
    }));

  // 无引用：不得给确定结论
  if (citations.length === 0) {
    return {
      answer:
        "知识库未检索到可引用证据，因此不能生成确定性结论。请先确认相关法规、标准、事故案例或企业资料已导入并完成人工审核，再行提问。",
      citations: [],
      retrieved,
      warnings: [
        ...warnings,
        "无引用证据，拒绝输出确定结论。",
        "重大隐患最终判定必须人工审核。",
      ],
      needsHumanReview: true,
      retrievalMode: search.retrievalMode,
      confidence: "none",
      sourceCoverage: 0,
    };
  }

  // 规则式答案拼装
  const cardList = citations.map((c) => `${c.card_code}「${c.title}」`).join("；");
  const relationHints = retrieved
    .filter((r) => r.related_channels && r.related_channels.length > 0)
    .slice(0, 4)
    .map((r) => `${r.card_code} 关联通道：${(r.related_channels as string[]).join("/")}`)
    .join("；");

  const reviewHint = needsReview(q, cardList)
    ? "本问题涉及断电/撤人/重大隐患/执法等高敏事项，必须由现场负责人与安全监管人员人工复核后才能形成最终判断，AI 不得自动给出处置结论。"
    : "建议结合现场实测与值班调度复核后再形成处置结论。";

  const bHint = B_PATTERN.test(q)
    ? "B01-B41 为物理约束生成/估计指标，仅作前兆辅助分析，不是现场实测，不得单独触发断电、撤人、执法或重大隐患判定。"
    : "";

  const answerParts = [
    `基于知识库 ${citations.length} 条证据（${cardList}），可作如下辅助参考：`,
    `检索模式：${search.retrievalMode}；证据相似度区间约 ${formatSimRange(retrieved)}。`,
    relationHints ? `关联线索：${relationHints}。` : "",
    `复核建议：${reviewHint}`,
    bHint,
    "说明：以上为知识库证据链汇总，不构成处置指令；最终判定须人工审核。",
  ].filter(Boolean);

  const answer = answerParts.join("\n");
  const needsHumanReview = needsReview(q, answer) || citations.some((c) => c.source_type === "physics_constrained");

  const confidence: KbAskResponse["confidence"] =
    citations.length >= 5 ? "high" : citations.length >= 3 ? "medium" : "low";
  const sourceCoverage = Math.min(1, citations.length / 5);

  if (needsHumanReview) {
    warnings.push("本回答涉及高敏事项或物理约束指标，需人工复核。");
  }
  warnings.push("无引用不输出确定结论；重大隐患最终判定必须人工审核。");

  return {
    answer,
    citations,
    retrieved,
    warnings,
    needsHumanReview,
    retrievalMode: search.retrievalMode,
    confidence,
    sourceCoverage,
  };
}

function formatSimRange(results: { similarity: number | null }[]): string {
  const sims = results.map((r) => r.similarity).filter((s): s is number => typeof s === "number");
  if (sims.length === 0) return "N/A";
  const lo = Math.min(...sims);
  const hi = Math.max(...sims);
  return `${lo.toFixed(2)}-${hi.toFixed(2)}`;
}
