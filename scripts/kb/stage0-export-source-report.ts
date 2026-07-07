import {
  countBy,
  countWhere,
  deduplicate,
  hasDuplicates,
  normalizeManifest,
  readManifest,
  repoPath,
  validateManifest,
  writeText
} from "./stage0-common.ts";

const inputPath = process.argv[2] ? repoPath(process.argv[2]) : repoPath("docs", "kb-source-manifest.example.json");
const outputPath = process.argv[3] ? repoPath(process.argv[3]) : repoPath("local-kb", "reports", "stage0-source-report.md");

const records = normalizeManifest(readManifest(inputPath));
const validationErrors = validateManifest(records);
const dedup = deduplicate(records);
const duplicatesFound = hasDuplicates(dedup);
const byType = countBy(records, "source_type");
const byLevel = countBy(records, "evidence_level");
const downloadedFulltext = countWhere(records, (record) => Boolean(record.local_path || record.storage_path));
const report = `# Stage 0 Source Report

## Summary

1. 资料总数：${records.length}
2. 各资料类型数量：${JSON.stringify(byType)}
3. 各证据等级数量：${JSON.stringify(byLevel)}
4. 可存全文数量：${countWhere(records, (record) => record.can_store_fulltext === true)}
5. 仅存元数据数量：${countWhere(records, (record) => record.can_store_fulltext !== true)}
6. 可用于 AI 的资料数量：${countWhere(records, (record) => record.can_use_for_ai === true)}
7. 可用于合规依据的资料数量：${countWhere(records, (record) => record.can_use_for_compliance === true)}
8. 需要人工审核数量：${countWhere(records, (record) => record.needs_human_review === true)}
9. 已下载全文数量：${downloadedFulltext}
10. 待人工上传资料数量：${countWhere(records, (record) => record.access_method === "manual_upload")}
11. 事故案例数量：${countWhere(records, (record) => record.source_type === "case_report")}
12. CNKI 候选文献数量：${countWhere(records, (record) => record.source_type === "cnki_literature" || record.database_source === "CNKI")}
13. WoS 候选文献数量：${countWhere(records, (record) => record.source_type === "wos_literature" || record.database_source === "Web of Science")}
14. 重复资料检查结果：${duplicatesFound ? "发现重复，详见 stage0-source-deduplication.json" : "未发现重复 source_id、标题、DOI、标准号或报告编号"}
15. 版权/存储风险提示：全文可在合法教育研究授权范围内下载，但只能进入 local-kb 或 Supabase 私有 Storage；GitHub 只提交元数据、规则、脚本和报告，不提交全文。
16. 下一阶段可进入 Supabase 知识库的资料范围：通过字段校验、无重复、已标记 evidence_level/source_type/related_modules，且 can_use_for_ai=true 的资料；用于合规依据的资料必须优先 L1/L2 并保留人工审核。

## Validation

- 校验结果：${validationErrors.length === 0 ? "passed" : "failed"}
- 校验错误数：${validationErrors.length}
- 去重结果：${duplicatesFound ? "failed" : "passed"}

## Boundary

- 事故案例已纳入核心资料体系，但只用于警示教育、相似性参考、风险链路复盘、报告引用和双重预防措施补强。
- 论文只支撑机理和模型解释，不能替代法规标准。
- 生成估计指标和 physics_constrained 指标不得写成真实传感器。
- 当前通道口径按 63 个通道记录。
`;

writeText(outputPath, report);

if (validationErrors.length > 0 || duplicatesFound) {
  console.error(`stage0 report generated with issues: ${outputPath}`);
  process.exit(1);
}

console.log(`stage0 report generated: ${outputPath}`);
