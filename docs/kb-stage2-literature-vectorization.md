# 阶段二：文献导入、抽取和向量化

## 目标

阶段二把项目已有资料导入 Supabase 知识库，形成可切片、可抽取、可向量检索、可人工审核的知识中枢流水线。

优先资料源：

- `瓦斯突出预警系统完整附录卡_v2_63维.md`
- `动态-6-10.xlsx`

## 脚本入口

- `scripts/kb/import-source-documents.ts`：登记 source_documents。
- `scripts/kb/chunk-documents.ts`：读取 Markdown 与 xlsx 文本并写入 document_chunks。
- `scripts/kb/extract-knowledge-cards.ts`：调用 AI API 抽取 knowledge_cards，失败时生成 knowledge_review_tasks。
- `scripts/kb/generate-embeddings.ts`：调用 AI embedding API 写入 knowledge_embeddings。
- `scripts/kb/import-knowledge-relations.ts`：导入核心知识关系。
- `scripts/kb/seed-core-knowledge.ts`：内置 R/B/S/C/D/F/AI guardrail 核心种子知识。

## 环境变量

Supabase 写入使用服务端环境变量：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

AI API 只从环境变量读取：

- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_EMBEDDING_MODEL`

不得把真实 API key 写入代码、文档、`.env.local.example` 或 Git 历史。

## 业务边界

- R01-R22 必须是 `real_sensor`。
- B01-B41 必须是 `physics_constrained`。
- B01-B41 必须写入 `model_boundary` 和 `human_review_policy`。
- B01-B41 不得单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。
- 法规条款只作为依据，不自动扩展成现场处置结论。
- 不确定内容 `needs_human_review=true`。
- AI 抽取失败必须写入 `knowledge_review_tasks`，不得静默丢弃。

## 建议执行顺序

```bash
node --experimental-strip-types scripts/kb/import-source-documents.ts
node --experimental-strip-types scripts/kb/chunk-documents.ts
node --experimental-strip-types scripts/kb/seed-core-knowledge.ts
node --experimental-strip-types scripts/kb/extract-knowledge-cards.ts 40
node --experimental-strip-types scripts/kb/generate-embeddings.ts all 200
node --experimental-strip-types scripts/kb/import-knowledge-relations.ts
```

如果没有配置 `AI_API_KEY` 等 AI 环境变量，抽取和 embedding 脚本会失败并生成审核任务或明确报错，不会生成伪向量。
