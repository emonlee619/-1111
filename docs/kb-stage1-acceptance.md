# 阶段一验收记录

## 在线 Supabase 验收

项目 `gas-outburst-knowledge-center` 已创建，Project ref 为 `uwyguflrwqsnbrqrgesa`。创建前通过 Supabase 成本接口确认项目创建成本为 `0 / monthly`。

已执行阶段一 DDL，验收结果：

- 12 张核心表已创建。
- 12 张核心表均启用 RLS。
- 必须索引已创建：`knowledge_cards.category`、`knowledge_cards.card_code`、`knowledge_cards.source_type`、`knowledge_cards.status`、`knowledge_cards.related_channels gin`、`document_chunks` full text、`knowledge_cards` full text、`knowledge_embeddings` vector、`knowledge_relations.source_card_code`、`knowledge_relations.target_card_code`。
- Storage buckets 已创建且均为 private：`kb-source-docs`、`kb-images`、`kb-generated-reports`。
- 种子知识卡数量：2。
- 种子规则数量：2。
- 种子模板数量：2。

## AI 与业务边界验收

- 63 通道口径已写入知识卡和规则。
- `R01-R22 = real_sensor` 已作为业务事实写入。
- `B01-B41 = physics_constrained` 已作为业务事实写入。
- `B01-B41` 不可直接触发断电、撤人、重大隐患确认、执法结论或现场实测结论。
- 重大隐患最终判定必须人工审核。
- AI 问答必须引用知识库证据；无证据时返回无法形成确定结论。

## 本地验证状态

已新增 Next.js API `/api/kb/*` 和页面 `/knowledge/center`。旧 `@/lib/knowledgeApi` 已重建为 Supabase `/api/kb/*` 客户端，不再依赖旧 FastAPI/Neo4j 知识代理。

已通过阶段一新链路定向 TypeScript 校验：

```bash
npx tsc -p tsconfig.stage1-kb.json --noEmit
```

已通过 Git 空白检查：

```bash
git diff --check
```

全量 `npm run lint` 和 `npm run build` 当前仍被既有前端拷贝中的非阶段一问题阻塞，包括旧 outburst/double-prevention 模块缺失 `@/lib/doublePreventionApi`、`@/lib/outburstApi`、`@/lib/outburstBusinessRules`、`@/lib/outburstChannelPolicy`、`@/lib/outburstRoutes`，以及既有组件中的 React lint 问题。阶段一新增知识中枢文件已用 `tsconfig.stage1-kb.json` 单独验证通过。
