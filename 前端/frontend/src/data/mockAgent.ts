import { agentSnapshotSchema } from "@/schemas/businessSchemas";
import type { AgentSnapshot } from "@/types/business";
import { mockKnowledge } from "./mockKnowledge";

export const mockAgent = agentSnapshotSchema.parse({
  recommendedQuestions: [
    "东翼回风巷当前为什么被标记为较大风险？",
    "WARN-20260627-001 关联了哪些真实传感器通道？",
    "隐患八步闭环现在卡在哪一步？",
    "数据增强生成通道和真实通道的边界是什么？",
  ],
  mockAnswer:
    "这是 mock 回答摘要：系统会汇总预警事件、区域风险和知识条目，给出辅助解释，但不替代人工安全判断，也不发出处置命令。",
  citations: mockKnowledge.standards.slice(0, 2),
  safetyPrompts: [
    "AI 回答仅作辅助检索与解释，不代表正式安全结论。",
    "处置动作必须由具备权限的人员按线下制度确认。",
    "本阶段不接真实大模型、知识库或生产数据接口。",
  ],
}) as AgentSnapshot;
