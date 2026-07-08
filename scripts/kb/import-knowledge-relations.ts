import { supabaseRest, writeReportJson } from "./stage2-common.ts";

type Relation = {
  source_card_code: string;
  target_card_code: string;
  relation_type: string;
  description: string;
  confidence_level: string;
};

const relations: Relation[] = [
  {
    source_card_code: "AI-GUARDRAIL-PHYSICS-CONSTRAINED",
    target_card_code: "AI-GUARDRAIL-HUMAN-REVIEW",
    relation_type: "requires_verification",
    description: "物理约束生成/估计指标触发的风险提示必须进入人工复核边界。",
    confidence_level: "high"
  },
  {
    source_card_code: "D-02",
    target_card_code: "AI-GUARDRAIL-PHYSICS-CONSTRAINED",
    relation_type: "based_on",
    description: "物理约束生成/估计指标闭环模板必须引用生成指标不得单独处置的 guardrail。",
    confidence_level: "high"
  },
  {
    source_card_code: "D-01",
    target_card_code: "AI-GUARDRAIL-HUMAN-REVIEW",
    relation_type: "requires_verification",
    description: "真实传感器触发闭环仍需在重大隐患最终判定环节进行人工审核。",
    confidence_level: "high"
  }
];

for (let i = 1; i <= 22; i++) {
  const code = `R${String(i).padStart(2, "0")}`;
  relations.push({
    source_card_code: code,
    target_card_code: `C-${code}`,
    relation_type: "controlled_by",
    description: `${code} 真实传感器指标对应管控措施卡。`,
    confidence_level: "medium"
  });
}

for (let i = 1; i <= 41; i++) {
  const code = `B${String(i).padStart(2, "0")}`;
  relations.push({
    source_card_code: code,
    target_card_code: "AI-GUARDRAIL-PHYSICS-CONSTRAINED",
    relation_type: "cannot_directly_trigger",
    description: `${code} 是 physics_constrained 指标，不能单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。`,
    confidence_level: "high"
  });
}

let inserted = 0;
for (const relation of relations) {
  const existing = await supabaseRest<Array<{ id: string }>>(
    `knowledge_relations?select=id&source_card_code=eq.${encodeURIComponent(relation.source_card_code)}&target_card_code=eq.${encodeURIComponent(relation.target_card_code)}&relation_type=eq.${encodeURIComponent(relation.relation_type)}&limit=1`
  );
  if (existing.length > 0) continue;
  await supabaseRest("knowledge_relations", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(relation)
  });
  inserted += 1;
}

writeReportJson("stage2-knowledge-relations.json", { candidate_relations: relations.length, inserted_relations: inserted, relations });
console.log(JSON.stringify({ candidate_relations: relations.length, inserted_relations: inserted }, null, 2));
