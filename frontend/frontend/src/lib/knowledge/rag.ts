import { supabaseRpc } from "@/lib/supabase/server";
import { completeWithAi, generateEmbedding } from "./aiClient";
import { assertCitedAnswer, citationsFromCards, enforcePhysicsBoundary, guardrailWarnings } from "./guardrails";
import { searchKnowledgeCards } from "./queries";
import type { KnowledgeCard, RagAnswer } from "./types";

type MatchRow = {
  card_code: string | null;
  similarity: number;
};

async function semanticCandidates(question: string) {
  const embedding = await generateEmbedding(question);
  if (!embedding) return [];
  const matches = await supabaseRpc<MatchRow[]>(
    "match_knowledge_embeddings",
    { query_embedding: embedding, match_threshold: 0.72, match_count: 8, filter_metadata: {} },
    true,
  );
  return matches.map((match) => match.card_code).filter(Boolean) as string[];
}

async function hydrateCards(cardCodes: string[], question: string) {
  const keywordCards = await searchKnowledgeCards({ q: question, limit: 8 });
  if (cardCodes.length === 0) return keywordCards;

  const codeCards = await Promise.all(cardCodes.map((code) => searchKnowledgeCards({ q: code, limit: 1 })));
  const merged = [...codeCards.flat(), ...keywordCards];
  return Array.from(new Map(merged.map((card) => [card.card_code, card])).values()).slice(0, 8);
}

export async function answerWithRag(question: string): Promise<RagAnswer> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      answer: "问题为空，无法检索知识库证据。",
      citations: [],
      warnings: ["请输入明确问题。", ...guardrailWarnings([])],
      retrieved_cards: [],
    };
  }

  const semanticCodes = await semanticCandidates(trimmed).catch(() => []);
  const cards = await hydrateCards(semanticCodes, trimmed);
  const citations = citationsFromCards(cards);
  const warnings = guardrailWarnings(cards);

  if (citations.length === 0) {
    return {
      answer: assertCitedAnswer("", citations),
      citations,
      warnings,
      retrieved_cards: cards,
    };
  }

  const context = cards
    .map(
      (card) =>
        `[${card.card_code}] ${card.title}\nsource_type=${card.source_type}\nsummary=${card.summary ?? ""}\nboundary=${card.model_boundary ?? ""}\nhuman_review=${card.human_review_policy ?? ""}`,
    )
    .join("\n\n");

  const aiAnswer = await completeWithAi([
    {
      role: "system",
      content:
        "你是煤矿瓦斯突出知识库问答服务。必须基于给定引用回答；不得无引用结论；不得把 physics_constrained 说成 real_sensor；不得直接确认重大隐患；不得单独给出撤人、断电或执法结论。",
    },
    { role: "user", content: `问题：${trimmed}\n\n可引用知识卡：\n${context}` },
  ]).catch(() => null);

  const fallback = `基于 ${citations.map((item) => item.card_code).join("、")}，系统只能形成证据链、风险解释和复核建议；涉及重大隐患、断电、撤人或执法结论必须人工审核。`;
  const answer = enforcePhysicsBoundary(assertCitedAnswer(aiAnswer ?? fallback, citations));

  return { answer, citations, warnings, retrieved_cards: cards };
}

export function cardsForModule(cards: KnowledgeCard[]) {
  return {
    monitoring_warning: cards.filter((card) => card.category === "dynamic_indicator" || card.category === "threshold_rule"),
    source_tracing: cards.filter((card) => card.category === "risk_mechanism" || card.category === "cause_chain" || card.model_boundary),
    dual_prevention: cards.filter((card) => card.category === "static_risk" || card.category === "control_measure" || card.category === "hidden_danger_template"),
    digital_twin: cards.filter((card) => card.related_locations?.length || card.related_channels?.length),
    data_model: cards.filter((card) => card.reliability_weight !== null || card.source_type === "physics_constrained"),
    knowledge_intelligence: cards,
    report_generation: cards.filter((card) => card.legal_basis?.length || card.control_measures?.length),
    system_management: cards.filter((card) => card.needs_human_review || card.version),
  };
}
