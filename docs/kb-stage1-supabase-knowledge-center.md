# 阶段一 Supabase 知识库与 AI 知识智能中枢

## Supabase 项目

- 项目名：`gas-outburst-knowledge-center`
- Project ref：`uwyguflrwqsnbrqrgesa`
- Region：`ap-southeast-1`
- 创建成本：Supabase 插件返回 `0 / monthly`

## 已建立数据库对象

阶段一已在 Supabase 中创建 12 张核心表：

- `source_documents`
- `document_chunks`
- `knowledge_cards`
- `knowledge_relations`
- `knowledge_rules`
- `knowledge_templates`
- `knowledge_embeddings`
- `knowledge_review_tasks`
- `knowledge_audit_logs`
- `ai_qa_sessions`
- `ai_qa_messages`
- `report_generation_records`

已启用 `vector` 和 `pgcrypto` 扩展。`knowledge_embeddings.embedding` 使用 `extensions.vector(1536)`。

## Storage Buckets

已创建 3 个私有 bucket：

- `kb-source-docs`
- `kb-images`
- `kb-generated-reports`

这些 bucket 不公开列目录，不用于 Git 提交全文。服务端导入脚本使用 service role key 上传和登记资料。

## RLS 与访问边界

所有 12 张 public 表均启用 RLS。普通前端只允许读取 `published` 状态的：

- `knowledge_cards`
- `knowledge_rules`
- `knowledge_templates`

普通前端没有 insert/update/delete 策略。导入、抽取、embedding、审核、问答记录和报告生成写入必须由服务端或脚本使用 service role key 完成。service role key 不能出现在浏览器环境变量、Git、日志或前端 bundle。

## 63 通道业务边界

- 当前系统通道数量必须以后端 `meta`、`sensors/latest`、`stats` 返回为准。
- 附录卡当前口径：22 个真实传感器指标位 + 41 个物理约束生成/估计指标 = 63 个动态输入特征。
- `R01-R22` 是 `real_sensor`。
- `B01-B41` 是 `physics_constrained`，不是真实传感器。
- `B01-B41` 不能单独触发断电、撤人、重大隐患确认、执法结论或现场实测结论。
- 重大隐患最终判定必须人工审核。
- AI 问答必须引用知识库证据，不允许空口生成结论。

## 本地工程入口

- Supabase 迁移：`supabase/migrations/20260707132146_stage1_knowledge_center.sql`
- 服务端 API：`frontend/frontend/src/app/api/kb/[...path]/route.ts`
- 前端页面：`frontend/frontend/src/app/knowledge/center/page.tsx`
- 页面组件：`frontend/frontend/src/components/knowledge/KnowledgeCenterClient.tsx`
- 服务端 REST 封装：`frontend/frontend/src/lib/kbSupabaseRest.ts`
- 导入脚本：`scripts/kb/stage1-import-source-documents.ts`
- 知识抽取脚本：`scripts/kb/stage1-extract-knowledge-cards.ts`
- embedding 脚本：`scripts/kb/stage1-build-embeddings.ts`
- 验收脚本：`scripts/kb/stage1-validate-knowledge-center.ts`

## 当前实现边界

阶段一已建立数据底座、RLS、Storage、检索 RPC、种子 guardrail、服务端 API 和前端页面。`stage1-build-embeddings.ts` 使用确定性 placeholder embedding 仅用于管线验收；正式 RAG 前必须替换为统一 embedding 模型，并重新生成 `knowledge_embeddings`。
