import { knowledgeSnapshotSchema } from "@/schemas/businessSchemas";
import type { KnowledgeSnapshot } from "@/types/business";

export const mockKnowledge = knowledgeSnapshotSchema.parse({
  standards: [
    { id: "STD-001", title: "瓦斯检查与通风管理条目", category: "通风安全", scenario: "瓦斯浓度波动复核", summary: "用于提示线下制度核查方向，非全文制度替代。" },
    { id: "STD-002", title: "防突措施执行记录要求", category: "防突管理", scenario: "钻孔压力异常", summary: "说明记录字段、责任单位和验收材料摘要。" },
    { id: "STD-003", title: "隐患闭环治理台账要求", category: "双重预防", scenario: "八步闭环", summary: "整理、分析、通报、整改、反馈、验收、审查、销号。" },
  ],
  causalGraph: [
    { label: "节点", value: "瓦斯、通风、地质、作业、微震" },
    { label: "关系边", value: "22 条 mock 因果关系" },
    { label: "边界", value: "不作为最终事故原因认定" },
  ],
  cultureBoards: [
    { label: "双控流程", value: "风险分级管控 + 隐患排查治理" },
    { label: "风险四色", value: "蓝/黄/橙/红" },
    { label: "优秀案例", value: "2 条演示案例摘要" },
  ],
}) as KnowledgeSnapshot;
