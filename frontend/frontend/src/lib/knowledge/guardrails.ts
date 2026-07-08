import type { Citation, KnowledgeCard } from "./types";

export const STANDARD_WARNINGS = [
  "AI 问答必须引用知识库证据；无证据时不得生成确定性结论。",
  "B01-B41 为 physics_constrained，不能说成 real_sensor。",
  "B01-B41 不能单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。",
  "重大隐患最终判定必须人工审核。",
];

export function citationsFromCards(cards: KnowledgeCard[]): Citation[] {
  return cards.slice(0, 8).map((card) => ({
    card_code: card.card_code,
    title: card.title,
    summary: card.summary,
    source_type: card.source_type,
    category: card.category,
  }));
}

export function guardrailWarnings(cards: KnowledgeCard[]) {
  const warnings = [...STANDARD_WARNINGS];
  if (cards.some((card) => card.source_type === "physics_constrained" || card.card_code.startsWith("B"))) {
    warnings.push("本次检索包含物理约束生成/估计指标，只能作为复核线索和辅助解释。");
  }
  if (cards.some((card) => card.needs_human_review)) {
    warnings.push("本次检索包含 needs_human_review=true 的知识卡，报告或处置前需人工审核。");
  }
  return Array.from(new Set(warnings));
}

export function assertCitedAnswer(answer: string, citations: Citation[]) {
  if (citations.length === 0) {
    return "知识库未检索到可引用证据，因此不能生成确定性回答。请先导入并审核相关知识卡。";
  }
  return answer;
}

export function enforcePhysicsBoundary(answer: string) {
  return answer
    .replace(/B(\d{2}).{0,12}真实传感器/g, "B$1 为物理约束生成/估计指标")
    .replace(/生成指标可以单独/g, "生成指标不得单独");
}
