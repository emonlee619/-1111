# Stage 0 Source Report

## Summary

1. 资料总数：7
2. 各资料类型数量：{"legal_regulation":1,"standard_spec":1,"case_report":1,"equipment_manual":1,"cnki_literature":1,"data_model_evidence":1,"wos_literature":1}
3. 各证据等级数量：{"L1":1,"L2":1,"L3":1,"L4":1,"L5":3}
4. 可存全文数量：6
5. 仅存元数据数量：1
6. 可用于 AI 的资料数量：7
7. 可用于合规依据的资料数量：2
8. 需要人工审核数量：7
9. 已下载全文数量：2
10. 待人工上传资料数量：2
11. 事故案例数量：1
12. CNKI 候选文献数量：1
13. WoS 候选文献数量：1
14. 重复资料检查结果：未发现重复 source_id、标题、DOI、标准号或报告编号
15. 版权/存储风险提示：全文可在合法教育研究授权范围内下载，但只能进入 local-kb 或 Supabase 私有 Storage；GitHub 只提交元数据、规则、脚本和报告，不提交全文。
16. 下一阶段可进入 Supabase 知识库的资料范围：通过字段校验、无重复、已标记 evidence_level/source_type/related_modules，且 can_use_for_ai=true 的资料；用于合规依据的资料必须优先 L1/L2 并保留人工审核。

## Validation

- 校验结果：passed
- 校验错误数：0
- 去重结果：passed

## Boundary

- 事故案例已纳入核心资料体系，但只用于警示教育、相似性参考、风险链路复盘、报告引用和双重预防措施补强。
- 论文只支撑机理和模型解释，不能替代法规标准。
- 生成估计指标和 physics_constrained 指标不得写成真实传感器。
- 当前通道口径按 63 个通道记录。
