/**
 * Stage 3 覆盖率统计
 *
 * 计算 63 维指标覆盖矩阵：
 * - R01-R22 真实传感器
 * - B01-B41 物理约束（isPhysicsConstrained=true，前端据此渲染边界）
 * - S01-S32 静态风险
 * - C-R / C-B / C-S 管控措施
 * - 报警阈值规则覆盖率、处置流程规则覆盖率
 * - source_documents 按 doc_type 分类
 * - review_tasks 按 review_reason 分组
 */

import { listAllCardsLite, listSourceDocuments, listReviewTasks, listRules, groupCount } from "./queries";
import type { KbCoverage, KbChannelGroupCoverage, KbApiMode } from "@/types/kb";

export const B_BOUNDARY_WARNING =
  "B01-B41 为物理约束生成/估计，不是现场实测，不得单独触发断电、撤人、执法或重大隐患判定。";

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function range(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${pad(i + 1)}`);
}

function buildGroup(
  group: KbChannelGroupCoverage["group"],
  label: string,
  expected: string[],
  cardCodes: Set<string>,
  isPhysicsConstrained = false,
): KbChannelGroupCoverage {
  const covered = expected.filter((code) => cardCodes.has(code));
  return {
    group,
    label,
    total: expected.length,
    covered: covered.length,
    missing: expected.filter((code) => !cardCodes.has(code)),
    isPhysicsConstrained,
  };
}

export async function buildCoverage(mode: KbApiMode): Promise<KbCoverage> {
  const warnings: string[] = [];

  const [cards, sources, tasks, rules] = await Promise.all([
    listAllCardsLite().catch(() => []),
    listSourceDocuments(200, 0).catch(() => []),
    listReviewTasks(300, 0).catch(() => []),
    listRules(200, 0).catch(() => []),
  ]);

  if (cards.length === 0) warnings.push("未读取到已发布知识卡，覆盖率统计可能为 0。");

  const cardCodes = new Set(cards.map((c) => c.card_code));

  const realtimeIndicators = buildGroup("R", "真实传感器 R01-R22", range("R", 22), cardCodes, false);
  const physicsConstrained = buildGroup("B", "物理约束 B01-B41", range("B", 41), cardCodes, true);
  const staticRisks = buildGroup("S", "静态风险 S01-S32", range("S", 32), cardCodes, false);
  const controlR = buildGroup("C-R", "管控措施 C-R01..C-R22", range("C-R", 22), cardCodes, false);
  const controlB = buildGroup("C-B", "管控措施 C-B01..C-B41", range("C-B", 41), cardCodes, false);
  const controlS = buildGroup("C-S", "管控措施 C-S01..C-S32", range("C-S", 32), cardCodes, false);

  // 报警阈值规则：RULE-Rxx
  const alarmRules = rules.filter((r) => r.rule_type === "alarm_threshold" || /^RULE-R\d/.test(r.rule_code));
  const alarmExpected = range("R", 22).map((c) => `RULE-${c}`);
  const alarmCovered = alarmRules.filter((r) => alarmExpected.includes(r.rule_code));
  const alarmThresholdRuleCount = alarmRules.length;
  const alarmThresholdRuleCoverage = alarmExpected.length ? alarmCovered.length / alarmExpected.length : 0;

  // 处置流程规则：RULE-CTRL-*
  const disposalRules = rules.filter((r) => r.rule_type === "control_disposal" || /^RULE-CTRL-/.test(r.rule_code));
  const disposalFlowRuleCount = disposalRules.length;
  const disposalFlowCoverage = rules.length ? disposalRules.length / rules.length : 0;

  const sourceDocumentsByType = groupCount(sources, (s) => s.doc_type);
  const reviewTasksByReason = groupCount(tasks, (t) => t.review_reason);

  return {
    mode,
    realtimeIndicators,
    physicsConstrained,
    staticRisks,
    controlR,
    controlB,
    controlS,
    alarmThresholdRuleCount,
    alarmThresholdRuleCoverage,
    disposalFlowRuleCount,
    disposalFlowCoverage,
    sourceDocumentsByType,
    reviewTasksByReason,
    bBoundaryWarning: B_BOUNDARY_WARNING,
    warnings,
  };
}
