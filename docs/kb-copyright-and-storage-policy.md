# 全文下载、版权与存储策略

## 基本原则

阶段零允许在合法教育研究授权范围内下载全文资料，用于企业内部资料源库、私有知识库和后续人工审核。教育研究授权不等于公开分发授权，不能把全文文件提交到 GitHub。

## 可下载资料

可在合法授权范围内下载 PDF、CAJ、NH、KDH、DOC、DOCX、标准文件、事故报告、论文全文、设备资料和企业内部资料。下载必须与明确主题和业务模块相关，不做无差别批量镜像。

## 存储边界

全文只允许进入 `local-kb/raw/**`、`local-kb/downloads/**`、`local-kb/extracted/**` 或 Supabase 私有 Storage。

GitHub 只提交 manifest 示例和实际元数据清单、规则、脚本、报告、结构化摘要和审核状态，不提交全文。

## Git 禁止提交内容

禁止提交 PDF、CAJ、NH、KDH、DOC、DOCX、标准全文、论文全文、企业内部资料、`.env`、密钥、token、数据库连接、模型权重、大型原始数据、SQLite/DB 文件、压缩包。

## 风险提示

`can_store_fulltext=true` 表示内部可保存全文，不表示可公开发布。`can_use_for_ai=true` 表示可进入企业内部 AI 引用候选，不表示无需人工审核。`can_use_for_compliance=true` 只对 L1/L2 或经人工审核的 L3/L4 生效。
