import { completeWithAi } from "./aiClient";
import { citationsFromCards, enforcePhysicsBoundary, guardrailWarnings } from "./guardrails";
import { insertReportRecord, searchKnowledgeCards } from "./queries";

export async function generateKnowledgeReport(input: { report_type: string; title?: string; topic?: string }) {
  const topic = input.topic?.trim() || input.title?.trim() || "煤矿瓦斯突出预警报告";
  const cards = await searchKnowledgeCards({ q: topic, limit: 10 });
  const citations = citationsFromCards(cards);
  const warnings = guardrailWarnings(cards);

  if (citations.length === 0) {
    return {
      id: null,
      title: input.title || topic,
      report_type: input.report_type,
      generated_content: "知识库未检索到可引用证据，不能生成报告草稿。请先导入并审核相关知识卡。",
      citations,
      warnings,
    };
  }

  const context = cards
    .map((card) => `[${card.card_code}] ${card.title}\n${card.summary ?? ""}\n${card.model_boundary ?? ""}`)
    .join("\n\n");
  const aiDraft = await completeWithAi([
    {
      role: "system",
      content:
        "生成煤矿安全报告草稿。必须带引用卡号，不得无证据结论；不得把 physics_constrained 写成 real_sensor；不得直接确认重大隐患或执法结论。",
    },
    { role: "user", content: `报告类型：${input.report_type}\n主题：${topic}\n\n证据：\n${context}` },
  ]).catch(() => null);

  const generated_content = enforcePhysicsBoundary(
    aiDraft ??
      `# ${input.title || topic}\n\n## 证据摘要\n本报告草稿基于 ${citations
        .map((item) => item.card_code)
        .join("、")} 形成。系统只提供证据链和复核建议；涉及重大隐患、断电、撤人或执法结论必须人工审核。\n\n## 边界\nB01-B41 如出现在引用中，只能作为物理约束生成/估计指标的辅助解释。`,
  );

  const id = await insertReportRecord({
    report_type: input.report_type,
    title: input.title || topic,
    input_payload: input,
    generated_content,
    citations,
  });

  return { id, title: input.title || topic, report_type: input.report_type, generated_content, citations, warnings };
}
