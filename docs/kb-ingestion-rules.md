# 资料入库与引用规则

## 入库流程

1. 登记 source manifest，生成 `source_id`。
2. 判断 `source_type`、`evidence_level`、来源机构、版本、状态和业务模块。
3. 判断是否可保存全文、是否可用于 AI、是否可作为合规依据、是否需要人工审核。
4. 在合法教育研究授权范围内按主题限量下载全文。
5. 写入 download log。
6. 全文进入 `local-kb/raw/**`、`local-kb/downloads/**`、`local-kb/extracted/**` 或 Supabase 私有 Storage。
7. 校验 manifest、去重、导出 stage0-source-report。
8. 人工审核后才允许进入后续知识卡、切片和向量索引阶段。

## 下载规则

允许合法下载 PDF、CAJ、NH、KDH、DOC、DOCX、标准文件、事故报告、论文全文。不允许无差别批量镜像 CNKI、Web of Science、Scopus 或标准数据库。每个主题优先下载高质量资料。全文下载必须生成 download log。

下载日志字段：`source_id`、`title`、`source_type`、`database_source`、`official_url`、`doi`、`standard_no`、`report_no`、`download_time`、`file_name`、`file_ext`、`local_path`、`storage_bucket`、`storage_path`、`copyright_status`、`access_method`、`can_store_fulltext`、`can_use_for_ai`、`can_use_for_compliance`、`needs_human_review`、`notes`。

## 切片规则

阶段零不生成最终知识卡。后续切片必须保留 `source_id`、页码或章节、证据等级、原文位置、人工审核状态和可引用边界。L1/L2 切片必须保留条款号或标准章节。L3 案例切片必须保留案例边界和“不得替代现场判断”的提示。

## 引用规则

合规依据优先 L1/L2。事故复盘和警示教育可引用 L3，但必须说明案例用途。企业现场闭环可引用 L4，但不得越过企业边界。论文 L5 只能支撑机理和模型解释。任何对外报告、整改建议、重大隐患判断都需要人工审核。

## 脱敏规则

企业内部资料、现场图纸、设备台账、人员记录、调度记录、传感器精确位置和数据库导出必须先判定是否脱敏。脱敏状态写入 manifest 和 review task。

## AI 可引用规则

`can_use_for_ai=true` 只表示可以进入企业内部 AI 引用候选，不表示可以直接作为最终结论。法规标准版本不明、事故原因、企业现场资料、模型评估报告、论文阈值或指标结论默认需要人工审核。

## 禁止误用边界

不得把论文结论写成法规要求；不得把事故案例相似性写成事故必然性；不得用案例替代现场复核、调度研判和人工法规审核；不得把生成估计指标写成真实传感器；不得提交 `.env`、密钥、token、数据库连接、模型权重、大型原始数据和全文文件。
