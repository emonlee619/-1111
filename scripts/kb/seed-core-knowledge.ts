import {
  APPENDIX_MD,
  rowsByCode,
  sanitizeCard,
  supabaseRest,
  readUtf8,
  writeReportJson,
  type KnowledgeCardInput
} from "./stage2-common.ts";

const appendix = readUtf8(APPENDIX_MD);
const sourceDocRows = await supabaseRest<Array<{ id: string }>>(
  `source_documents?select=id&title=eq.${encodeURIComponent("瓦斯突出预警系统完整附录卡_v2_63维")}&limit=1`
).catch(() => []);
const sourceIds = sourceDocRows[0]?.id ? [sourceDocRows[0].id] : [];

function cell(row: string[], index: number) {
  return row[index]?.trim() ?? "";
}

function baseCard(card: KnowledgeCardInput): KnowledgeCardInput {
  return sanitizeCard({
    source_document_ids: sourceIds,
    status: "published",
    version: "v1",
    confidence_level: "high",
    needs_human_review: true,
    ...card
  });
}

const cards: KnowledgeCardInput[] = [];

const rRows = rowsByCode(appendix, /^R\d{2}$/).filter((row) => row[2] === row[0]).slice(0, 22);
const bRows = rowsByCode(appendix, /^B\d{2}$/).filter((row) => row[2] === row[0]).slice(0, 41);
const sRows = rowsByCode(appendix, /^S\d{2}$/).slice(0, 32);

for (const row of rRows) {
  const code = cell(row, 0);
  cards.push(
    baseCard({
      card_code: code,
      title: `${code} ${cell(row, 4)} ${cell(row, 5)}`.trim(),
      category: "dynamic_indicator",
      source_type: "real_sensor",
      summary: `${cell(row, 10)}；异常表现：${cell(row, 11)}`,
      full_content: row.join(" | "),
      related_channels: [code],
      related_locations: [cell(row, 5)].filter(Boolean),
      physical_meaning: cell(row, 10),
      abnormal_signs: [cell(row, 11)].filter(Boolean),
      verification_actions: ["现场复核", "传感器调校核验", "联动核对后端 meta/sensors/latest/stats"],
      control_measures: [cell(row, 13)].filter(Boolean),
      legal_basis: [cell(row, 12)].filter(Boolean),
      reliability_weight: 1,
      model_boundary: cell(row, 14) || "真实传感器输入通道。",
      human_review_policy: cell(row, 15) || "涉及重大隐患、撤人、断电或执法结论时必须人工审核。"
    })
  );
}

for (const row of bRows) {
  const code = cell(row, 0);
  cards.push(
    baseCard({
      card_code: code,
      title: `${code} ${cell(row, 3)} ${cell(row, 4)}`.trim(),
      category: "dynamic_indicator",
      source_type: "physics_constrained",
      summary: `${cell(row, 8)}；异常表现：${cell(row, 9)}`,
      full_content: row.join(" | "),
      related_channels: [code, ...cell(row, 7).split(/[;；,，]/).map((value) => value.trim()).filter(Boolean)],
      related_locations: [cell(row, 4)].filter(Boolean),
      physical_meaning: cell(row, 8),
      abnormal_signs: [cell(row, 9)].filter(Boolean),
      verification_actions: [cell(row, 11), "真实传感器 R01-R22 交叉复核", "现场复核"].filter(Boolean),
      control_measures: [cell(row, 12)].filter(Boolean),
      reliability_weight: 0.5,
      model_boundary: "B01-B41 为物理约束生成/估计指标，不是真实传感器；不得单独作为现场处置、断电、撤人、重大隐患确认、执法结论或现场实测结论依据。",
      human_review_policy: "必须结合真实传感器、现场复核、调度研判和人工法规审核；不确定内容 needs_human_review=true。"
    })
  );
}

for (const row of sRows) {
  const code = cell(row, 0);
  cards.push(
    baseCard({
      card_code: code,
      title: `${code} ${cell(row, 1)}`,
      category: "static_risk",
      source_type: "static_prior",
      summary: cell(row, 2) || `${code} 静态危险源，需人工维护来源和周期。`,
      full_content: row.join(" | "),
      related_channels: cell(row, 3).split(/[;；,，]/).map((value) => value.trim()).filter(Boolean),
      verification_actions: [cell(row, 5), cell(row, 6), "人工巡检复核"].filter(Boolean),
      control_measures: [cell(row, 7)].filter(Boolean),
      model_boundary: "静态危险源只作为风险背景和管控线索，不替代现场巡检、制度审核或人工确认。",
      human_review_policy: "静态风险、隐患闭环和重大隐患判定必须人工审核。"
    })
  );
}

for (const row of rowsByCode(appendix, /^C-R\d{2}$/)) {
  const code = cell(row, 0);
  const channel = (cell(row, 1).match(/R\d{2}/)?.[0] ?? "").trim();
  cards.push(
    baseCard({
      card_code: code,
      title: `${code} ${cell(row, 1)} 管控措施`,
      category: "control_measure",
      source_type: "real_sensor",
      summary: `${cell(row, 3)}；核查：${cell(row, 4)}`,
      full_content: row.join(" | "),
      related_channels: [channel].filter(Boolean),
      verification_actions: [cell(row, 4)].filter(Boolean),
      control_measures: [cell(row, 5)].filter(Boolean),
      legal_basis: [cell(row, 7)].filter(Boolean),
      model_boundary: cell(row, 8) || "真实传感器触发措施仍需核对现场制度和适用法规。",
      human_review_policy: "升级撤人、断电范围、重大隐患最终判定必须人工审核。"
    })
  );
}

for (const row of rowsByCode(appendix, /^C-B/)) {
  const code = cell(row, 0).replace("~", "-");
  cards.push(
    baseCard({
      card_code: code,
      title: `${code} 物理约束生成指标管控措施`,
      category: "control_measure",
      source_type: "physics_constrained",
      summary: `${cell(row, 2)}；核查：${cell(row, 3)}`,
      full_content: row.join(" | "),
      related_channels: (cell(row, 1).match(/B\d{2}/g) ?? []),
      verification_actions: [cell(row, 3), "真实传感器交叉复核", "现场复核"].filter(Boolean),
      control_measures: [cell(row, 4)].filter(Boolean),
      model_boundary: "C-B 类措施只处理物理约束生成/估计指标的复核和辅助解释，不得单独触发强制现场处置。",
      human_review_policy: "必须由真实传感器、现场复核和调度研判共同支撑；重大隐患最终判定需人工审核。"
    })
  );
}

for (let i = 1; i <= 32; i++) {
  const sCode = `S${String(i).padStart(2, "0")}`;
  cards.push(
    baseCard({
      card_code: `C-${sCode}`,
      title: `${sCode} 静态风险/人工巡检管控措施`,
      category: "control_measure",
      source_type: "static_prior",
      summary: `${sCode} 对应静态危险源的人工巡检、台账核验、制度整改和闭环确认措施。`,
      related_channels: [sCode],
      verification_actions: ["人工巡检", "台账核验", "制度记录复核"],
      control_measures: ["形成隐患闭环任务", "补充现场证据", "更新风险分级管控记录"],
      model_boundary: "C-S 类措施不由模型单独触发执法或重大隐患结论。",
      human_review_policy: "静态风险和人工巡检结论必须人工审核。"
    })
  );
}

cards.push(
  baseCard({
    card_code: "AI-GUARDRAIL-PHYSICS-CONSTRAINED",
    title: "生成指标不得单独作为现场处置依据",
    category: "ai_guardrail",
    source_type: "system_rule",
    summary: "B01-B41 为 physics_constrained，不得单独作为断电、撤人、重大隐患确认、执法结论或现场实测结论依据。",
    related_channels: ["B01-B41"],
    model_boundary: "生成/估计指标不是现场真实传感器。",
    human_review_policy: "必须结合 R01-R22、现场复核、调度研判和人工法规审核。"
  }),
  baseCard({
    card_code: "AI-GUARDRAIL-HUMAN-REVIEW",
    title: "重大隐患最终判定需人工审核",
    category: "ai_guardrail",
    source_type: "system_rule",
    summary: "系统只能形成候选风险、证据链和复核建议；重大隐患最终判定必须人工审核。",
    related_channels: ["R01-R22", "B01-B41", "S01-S32"],
    model_boundary: "AI 问答必须引用知识库证据，不允许空口生成结论。",
    human_review_policy: "重大隐患、执法结论、撤人和断电范围由人工审核确认。"
  })
);

const uniqueCards = Array.from(new Map(cards.map((card) => [card.card_code, card])).values());

await supabaseRest("knowledge_cards?on_conflict=card_code", {
  method: "POST",
  headers: { prefer: "return=minimal,resolution=merge-duplicates" },
  body: JSON.stringify(uniqueCards)
});

const templates = [
  {
    template_code: "D-01",
    title: "真实传感器触发闭环模板",
    template_type: "hidden_danger_template",
    trigger_source_type: "real_sensor",
    related_channels: ["R01-R22"],
    fields_schema: { fields: ["sensor_snapshot", "threshold_event", "site_verification", "control_action", "power_cut_or_restore", "human_review", "closeout"] },
    default_content: { boundary: "真实传感器触发仍需按适用法规、现场制度和人工审核确认。" },
    status: "published"
  },
  {
    template_code: "D-02",
    title: "物理约束生成/估计指标触发闭环模板",
    template_type: "hidden_danger_template",
    trigger_source_type: "physics_constrained",
    related_channels: ["B01-B41"],
    fields_schema: { fields: ["generated_signal", "related_real_sensors", "physical_validation", "site_review", "human_review", "boundary_warning", "closeout"] },
    default_content: { boundary: "B01-B41 不能单独触发现场强制处置。" },
    status: "published"
  },
  {
    template_code: "D-03",
    title: "静态风险/人工巡检触发闭环模板",
    template_type: "hidden_danger_template",
    trigger_source_type: "static_prior",
    related_channels: ["S01-S32"],
    fields_schema: { fields: ["static_risk", "inspection_record", "evidence_files", "rectification", "human_review", "closeout"] },
    default_content: { boundary: "静态风险必须由人工巡检和台账证据闭环。" },
    status: "published"
  }
];

await supabaseRest("knowledge_templates?on_conflict=template_code", {
  method: "POST",
  headers: { prefer: "return=minimal,resolution=merge-duplicates" },
  body: JSON.stringify(templates)
});

const rules = [
  {
    rule_code: "F-ALARM-METHANE",
    title: "F 类甲烷阈值与报警规则",
    rule_type: "threshold_alarm",
    applies_to_channels: ["R01-R08"],
    condition_json: { methane_alarm: "按照适用法规、标准和现场制度核定" },
    action_json: { action: "alarm_and_site_verification" },
    legal_basis: ["煤矿安全规程", "AQ 6201-2019"],
    boundary_notes: "法规条款只作为依据，不自动扩展成现场处置结论。",
    requires_human_review: true,
    status: "published"
  },
  {
    rule_code: "F-POWER-CUT-RESTORE",
    title: "F 类断电、复电与闭锁规则",
    rule_type: "power_cut_restore",
    applies_to_channels: ["R01-R08", "R15", "R20"],
    condition_json: { source_type: "real_sensor", requires_site_policy: true },
    action_json: { action: "create_closure_task_and_require_human_review" },
    legal_basis: ["煤矿安全规程", "煤矿重大事故隐患判定标准"],
    boundary_notes: "断电、复电和闭锁范围必须按适用版本、现场制度和人工审核确认。",
    requires_human_review: true,
    status: "published"
  },
  {
    rule_code: "F-EVACUATION-MAJOR-HAZARD",
    title: "F 类撤人与重大隐患人工审核规则",
    rule_type: "evacuation_major_hazard",
    applies_to_channels: ["R01-R22", "B01-B41", "S01-S32"],
    condition_json: { major_hazard_candidate: true },
    action_json: { action: "create_review_task", final_decision: "human_review_only" },
    legal_basis: ["煤矿重大事故隐患判定标准"],
    boundary_notes: "B01-B41、案例相似性或 AI 输出不能单独形成重大隐患最终判定。",
    requires_human_review: true,
    status: "published"
  }
];

await supabaseRest("knowledge_rules?on_conflict=rule_code", {
  method: "POST",
  headers: { prefer: "return=minimal,resolution=merge-duplicates" },
  body: JSON.stringify(rules)
});

const report = {
  cards: uniqueCards.length,
  templates: templates.length,
  rules: rules.length,
  real_sensor_cards: uniqueCards.filter((card) => card.source_type === "real_sensor").length,
  physics_constrained_cards: uniqueCards.filter((card) => card.source_type === "physics_constrained").length,
  static_risk_cards: uniqueCards.filter((card) => card.category === "static_risk").length
};
writeReportJson("stage2-core-knowledge-seed.json", report);
console.log(JSON.stringify(report, null, 2));
