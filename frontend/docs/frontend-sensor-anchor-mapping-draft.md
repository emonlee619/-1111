# 62 点位与三维底模映射草案

日期：2026-07-04

## 结论

- 输入表：动态-6-10.xlsx，共 62 行。
- 输入模型：3Dmodel.dwg，当前 GLB 由真实 SAT 拓扑三角化生成，保留 CAD handle。
- 自动生成 26 个空间锚点，映射 62 个传感器/监测指标。
- 当前是确认草案：位置来自真实 Excel，三维锚点和 handle 为规则推断；实时数值仍应保持 mock/待接入边界。
- 低置信度点位 10 个，主要集中在避险硐室、切眼两端、采空区侧和地质构造异常区，需要结合 CAD 标注或现场布置确认。

## 展示策略结论

当前 3Dmodel.dwg/GLB 中可以识别出回风侧管路候选结构。handle 260D 和 2615 具有管状几何特征，结合示意图和已有空间语义，可作为回风侧管路/抽采管路候选对象展示。

当前 `/twin/tunnel` 三维巷道页只直接展示通风、气体环境、回风侧管路相关数据。62 点位仍然全部保留，但不再全部尝试贴到三维巷道模型上，而是分配到不同展示层：

- `ventilation_3d`：直接显示在三维巷道页。
- `pipe_3d`：直接显示在三维巷道页的管路层。
- `sensors_panel`：在 `/twin/sensors` 中显示。
- `heatmap_only`：参与 `/twin/risk-heatmap` 聚合。
- `data_model_only`：只在 `/data/features` 或 `/data/augmentation` 中解释。
- `model_extension_required`：需要后续补建煤壁钻孔、顶底板、采空区、构造异常区等模型层。
- `low_confidence_pending`：低置信点位，先显示为待确认。

本次不删除任何 62 点位，只是在结构化映射中增加 `displayLayer`、`isPhysicalSensor`、`isDerivedMetric`、`derivedFrom`、`frontendPlacement` 字段，用于区分三维直显、面板展示、聚合展示和数据模型说明。

## 推荐展示层分类

| displayLayer | 点位 | 前端位置说明 |
| --- | --- | --- |
| `ventilation_3d` | S-CH4-001, S-CH4-002, S-CH4-003, S-CH4-004, S-CH4-005, S-CO-001, S-TEMP-001, S-AIRSPD-001, S-O2-001, S-DUST-001, S-AIRDIR-001, S-CH4-RATE-001, S-CH4-RATE-002 | 直接显示在 `/twin/tunnel` 的通风与气体环境层，同时进入 `/twin/sensors` 全量表。 |
| `pipe_3d` | S-CH4-007, S-CH4-008, S-TEMP-002, S-TEMP-003, S-PRESS-001, S-PRESS-002, S-FLOW-001, S-FLOW-002, S-CH4-RATE-003, S-GAS-FLOW-K-001 | 直接显示在 `/twin/tunnel` 的回风侧管路层，同时进入 `/twin/sensors` 全量表。 |
| `model_extension_required` | S-DRILL-S-001, S-DRILL-S-002, S-GASP-001, S-GASP-002, S-GASP-003, S-GASP-TREND-001, S-GASP-TREND-002, S-GASP-TREND-003, S-Q-001, S-K1-001, S-COAL-TEMP-001, S-EMR-I-001, S-EMR-I-002, S-EMR-P-001, S-EMR-P-002, S-AE-RATE-001, S-AE-RATE-002, S-AE-DA12-001, S-AE-DA13-001, S-AE-N-001, S-AE-N-002, S-MS-FREQ-001, S-MS-FREQ-002, S-MS-FREQ-003, S-MS-FREQ-004, S-MS-ENERGY-001, S-MS-ENERGY-002, S-MS-ENERGY-003, S-MS-ENERGY-004, S-MS-B-001, S-MS-B-002, S-MS-B-003, S-MS-B-004, S-DEF-001, S-DEF-002, S-DEF-003, S-DEF-004 | 不在当前三维巷道底模上直接贴点；在 `/twin/sensors` 中展示，并作为 `/twin/risk-heatmap` 聚合风险来源。 |
| `low_confidence_pending` | S-CH4-006, S-CO2-001, S-GASP-003, S-GASP-TREND-003, S-MS-FREQ-003, S-MS-FREQ-004, S-MS-ENERGY-003, S-MS-ENERGY-004, S-MS-B-003, S-MS-B-004 | 额外低置信标记，不改变其原始展示层；在 `/twin/sensors` 中显示为待确认。 |

## 映射依据

- 长壁通风结构按进风侧/运输侧进入，穿过工作面后由回风侧/回风巷返回；因此“采面进风侧”“运输巷”优先落到低位交汇区 handle 26A6，“采面回风”“回风巷”优先落到主巷道长段 handle 2AA3。
- 采煤工作面、回风巷、回风隅角、回风巷中部、瓦斯抽采输入/输出管路等属于甲烷重点监测位置，因此甲烷、瓦斯变化率、管道压力/流量优先绑定这些空间语义。
- 预测钻孔、测压孔、电磁辐射、声发射、微震点位没有 Excel 坐标，按文字中的“运输巷/回风巷/顶板/底板/5m/10m/切眼/采空区侧”自动归入对应锚点。

## 外部参考

- Coal Mine Safety Regulations, methane sensor locations: https://xxgk.jl.gov.cn/gljg/jgsw_98132/zcfg/202207/P020220704556136075804.pdf
- 30 CFR Part 75 Subpart D, Ventilation: https://www.ecfr.gov/current/title-30/chapter-I/subchapter-O/part-75/subpart-D
- NIOSH Mining Ventilation Overview: https://archive.cdc.gov/www_cdc_gov/niosh/mining/topics/ventilation.html
- National Academies longwall ventilation plan description: https://www.nationalacademies.org/read/25111/chapter/14

## 指标数量

| 指标 | 数量 |
| --- | --- |
| 甲烷 | 8 |
| 巷道围岩变形量 | 4 |
| 微震事件频次 | 4 |
| 微震事件能量 | 4 |
| 微震 b 值 | 4 |
| 温度 | 3 |
| 煤层原始瓦斯压力 | 3 |
| 煤层瓦斯压力波动趋势 | 3 |
| 瓦斯浓度变化率 | 3 |
| 压力 | 2 |
| 流量 | 2 |
| 钻屑量 (S) | 2 |
| 电磁辐射强度 | 2 |
| 电磁辐射脉冲数 | 2 |
| 声发射事件率 | 2 |
| 声发射异常频次（N） | 2 |
| 一氧化碳 | 1 |
| 二氧化碳 | 1 |
| 风速 | 1 |
| 氧气 | 1 |
| 粉尘 | 1 |
| 风向 | 1 |
| 钻孔瓦斯涌出初速度 (q) | 1 |
| 钻屑瓦斯解吸指标 (K₁) | 1 |
| 瓦斯涌出量波动系数 | 1 |
| 煤体内部温度变化 | 1 |
| 声发射12h偏差值（DA） | 1 |
| 声发射13h偏差值（DA） | 1 |

## 空间区段数量

| 空间区段 | 点位数 |
| --- | --- |
| 回风巷 | 15 |
| 运输巷 | 11 |
| 回风管路 | 10 |
| 预测钻孔 | 9 |
| 采面 | 4 |
| 切眼 | 4 |
| 采空区侧 | 3 |
| 采面回风侧 | 2 |
| 构造异常区 | 2 |
| 进风侧 | 1 |
| 回风高位钻孔 | 1 |

## 空间锚点草案

| anchorId | 标签 | 区段 | 关联 handles | 置信度 | CAD 坐标 | Scene 坐标 |
| --- | --- | --- | --- | --- | --- | --- |
| working-face-mid | 采面工作面 | 采面 | 2AA3 | inferred_from_geometry | [899.516, 1732.059, 87.234] | [0.141717, -0.065353, -0.562421] |
| working-face-upper-corner | 采面上隅角 | 采面回风侧 | 2AA3, 263E, 26A0 | inferred_from_existing_mock_anchor | [822.282, 1876.874, 125.498] | [-0.630623, 0.317287, -2.010571] |
| return-airway-near-face | 采面回风 | 回风巷 | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor | [969.515, 1800.481, 108.363] | [0.841707, 0.145937, -1.246641] |
| intake-side-near-face | 采面进风侧 | 进风侧 | 26A6, 266E, 26C7 | inferred_from_existing_mock_anchor | [792.667, 1363.489, 1.053] | [-0.926773, -0.927163, 3.123279] |
| setup-entry-cut-eye | 采面切眼侧 | 切眼 | 2A76, 2B2D, 2B55 | inferred_from_geometry | [708.876, 1301.08, 171.0] | [-1.764683, 0.772307, 3.747369] |
| return-buried-pipe | 采面回风埋管管道 | 回风管路 | 260D, 2608, 2603, 2A7B | inferred_from_pipe_handles | [798.318, 2098.563, 181.2] | [-0.870263, 0.874307, -4.227461] |
| return-pipe | 采面回风管道 | 回风管路 | 2615, 2611, 2A7B | inferred_from_pipe_handles | [814.318, 2098.563, 181.2] | [-0.710263, 0.874307, -4.227461] |
| return-high-drill-rig | 采面回风高位钻机 | 回风高位钻孔 | 2A7B, 2603, 2608, 2611, 2615 | low_needs_cad_label_confirmation | [812.0, 2118.0, 176.0] | [-0.733443, 0.822307, -4.421831] |
| return-refuge-chamber | 采面回风巷避险硐室 | 回风巷 | 26A6, 2A76 | low_needs_cad_label_confirmation | [717.353, 1318.755, 97.984] | [-1.679913, 0.042147, 3.570619] |
| prediction-borehole-5m | 采面煤壁前方预测钻孔 5m | 预测钻孔 | 2AA3, 2698, 269C | inferred_from_existing_mock_anchor | [871.508, 1573.295, 52.902] | [-0.138363, -0.408673, 1.025219] |
| prediction-borehole-10m | 采面煤壁前方预测钻孔 10m | 预测钻孔 | 2AA3, 2698, 269C | inferred_from_geometry | [889.0, 1644.857, 70.471] | [0.036557, -0.232983, 0.309599] |
| transport-advance-0-20-roof | 运输巷超前支护段 0-20m 顶板 | 运输巷 | 2A76, 2B2D, 2B55 | inferred_from_named_risk_marker | [708.876, 1301.08, 171.0] | [-1.764683, 0.772307, 3.747369] |
| transport-advance-20-50-roof | 运输巷超前支护段 20-50m 顶板 | 运输巷 | 26A6 | inferred_from_geometry | [821.202, 1310.931, 79.053] | [-0.641423, -0.147163, 3.648859] |
| transport-advance-0-20-ribs | 运输巷超前支护段 0-20m 两帮 | 运输巷 | 26A6, 2666, 26D3 | inferred_from_geometry | [717.353, 1318.755, 97.984] | [-1.679913, 0.042147, 3.570619] |
| return-advance-0-20-ribs | 回风巷超前支护段 0-20m 两帮 | 回风巷 | 2AA3, 265E, 26AB | inferred_from_geometry | [929.015, 1841.743, 118.696] | [0.436707, 0.249267, -1.659261] |
| transport-pressure-hole | 运输巷原始煤体测压孔 | 运输巷 | 26A6, 26CB, 2676 | inferred_from_geometry | [715.118, 1205.931, 0.053] | [-1.702263, -0.937163, 4.698859] |
| return-pressure-hole | 回风巷原始煤体测压孔 | 回风巷 | 2AA3, 264C, 26B3 | inferred_from_geometry | [861.635, 1966.026, 145.577] | [-0.237093, 0.518077, -2.902091] |
| geological-anomaly-pressure-hole | 地质构造异常区测压孔 | 构造异常区 | 2AA3, 263E, 26A0 | low_needs_domain_confirmation | [837.434, 1811.07, 111.763] | [-0.479103, 0.179937, -1.352531] |
| emr-mobile-5m | 工作面煤壁前方 5m 移动测点 | 预测钻孔 | 2AA3, 26B7, 26BB | inferred_from_geometry | [866.5, 1908.8, 133.0] | [-0.188443, 0.392307, -2.329831] |
| emr-mobile-10m | 工作面煤壁前方 10m 移动测点 | 预测钻孔 | 2AA3, 264C, 26B3 | inferred_from_geometry | [866.5, 1966.0, 146.0] | [-0.188443, 0.522307, -2.901831] |
| transport-floor-borehole | 运输巷底板钻孔 | 运输巷 | 26A6, 2672, 26BF | inferred_from_geometry | [701.5, 1327.01, 0.053] | [-1.838443, -0.937163, 3.488069] |
| return-floor-borehole | 回风巷底板钻孔 | 回风巷 | 2AA3, 265A, 26AF | inferred_from_geometry | [914.25, 1865.5, 119.873] | [0.289057, 0.261037, -1.896831] |
| transport-roof-borehole | 运输巷顶板钻孔 | 运输巷 | 2A76, 2B2D, 26CF | inferred_from_geometry | [728.0, 1278.0, 171.0] | [-1.573443, 0.772307, 3.978169] |
| return-roof-borehole | 回风巷顶板钻孔 | 回风巷 | 2AA3, 265E, 26AB | inferred_from_geometry | [929.0, 1841.7, 119.0] | [0.436557, 0.252307, -1.658831] |
| setup-entry-cut-eye-roof | 切眼两端顶板钻孔 | 切眼 | 2A7B, 2603, 2611 | low_needs_cad_label_confirmation | [812.0, 2118.0, 176.0] | [-0.733443, 0.822307, -4.421831] |
| gob-side-roof-borehole | 采空区侧巷道顶板钻孔 | 采空区侧 | 2AA3, 261A, 261E, 2622 | low_needs_cad_label_confirmation | [804.389, 2074.04, 171.0] | [-0.809553, 0.772307, -3.982231] |

## 低置信度待确认项

| Excel 行 | sensorId | 指标 | 原始空间位置 | anchorId | 关联 handles |
| --- | --- | --- | --- | --- | --- |
| 6 | S-CH4-006 | 甲烷 | 采面回风高位钻机 | return-high-drill-rig | 2A7B, 2603, 2608, 2611, 2615 |
| 10 | S-CO2-001 | 二氧化碳 | 面回风巷避险硐室 | return-refuge-chamber | 26A6, 2A76 |
| 30 | S-GASP-003 | 煤层原始瓦斯压力 | 地质构造异常区测压孔 | geological-anomaly-pressure-hole | 2AA3, 263E, 26A0 |
| 33 | S-GASP-TREND-003 | 煤层瓦斯压力波动趋势 | 地质构造异常区测压孔 | geological-anomaly-pressure-hole | 2AA3, 263E, 26A0 |
| 53 | S-MS-FREQ-003 | 微震事件频次 | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 |
| 54 | S-MS-FREQ-004 | 微震事件频次 | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 |
| 57 | S-MS-ENERGY-003 | 微震事件能量 | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 |
| 58 | S-MS-ENERGY-004 | 微震事件能量 | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 |
| 61 | S-MS-B-003 | 微震 b 值 | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 |
| 62 | S-MS-B-004 | 微震 b 值 | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 |

## 62 点位映射明细

| Excel 行 | sensorId | 指标 | 单位草案 | 原始空间位置 | anchorId | 关联 handles | 置信度 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | S-CH4-001 | 甲烷 | % | 采面上隅角 | working-face-upper-corner | 2AA3, 263E, 26A0 | inferred_from_existing_mock_anchor |
| 2 | S-CH4-002 | 甲烷 | % | 采面工作面 | working-face-mid | 2AA3 | inferred_from_geometry |
| 3 | S-CH4-003 | 甲烷 | % | 采面回风 | return-airway-near-face | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor |
| 4 | S-CH4-004 | 甲烷 | % | 采面切眼侧 | setup-entry-cut-eye | 2A76, 2B2D, 2B55 | inferred_from_geometry |
| 5 | S-CH4-005 | 甲烷 | % | 采面进风侧 | intake-side-near-face | 26A6, 266E, 26C7 | inferred_from_existing_mock_anchor |
| 6 | S-CH4-006 | 甲烷 | % | 采面回风高位钻机 | return-high-drill-rig | 2A7B, 2603, 2608, 2611, 2615 | low_needs_cad_label_confirmation |
| 7 | S-CH4-007 | 甲烷 | % | 采面回风埋管管道 | return-buried-pipe | 260D, 2608, 2603, 2A7B | inferred_from_pipe_handles |
| 8 | S-CH4-008 | 甲烷 | % | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 9 | S-CO-001 | 一氧化碳 | ppm | 采面回风 | return-airway-near-face | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor |
| 10 | S-CO2-001 | 二氧化碳 | % | 面回风巷避险硐室 | return-refuge-chamber | 26A6, 2A76 | low_needs_cad_label_confirmation |
| 11 | S-TEMP-001 | 温度 | °C | 采面回风 | return-airway-near-face | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor |
| 12 | S-TEMP-002 | 温度 | °C | 采面回风埋管管道 | return-buried-pipe | 260D, 2608, 2603, 2A7B | inferred_from_pipe_handles |
| 13 | S-TEMP-003 | 温度 | °C | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 14 | S-AIRSPD-001 | 风速 | m/s | 采面回风 | return-airway-near-face | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor |
| 15 | S-O2-001 | 氧气 | % | 采面 | working-face-mid | 2AA3 | inferred_from_geometry |
| 16 | S-PRESS-001 | 压力 | kPa | 采面回风埋管管道 | return-buried-pipe | 260D, 2608, 2603, 2A7B | inferred_from_pipe_handles |
| 17 | S-PRESS-002 | 压力 | kPa | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 18 | S-DUST-001 | 粉尘 | mg/m³ | 采面 | working-face-mid | 2AA3 | inferred_from_geometry |
| 19 | S-AIRDIR-001 | 风向 | ° | 采面 | working-face-mid | 2AA3 | inferred_from_geometry |
| 20 | S-FLOW-001 | 流量 | m³/min | 采面回风埋管管 | return-buried-pipe | 260D, 2608, 2603, 2A7B | inferred_from_pipe_handles |
| 21 | S-FLOW-002 | 流量 | m³/min | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 22 | S-DRILL-S-001 | 钻屑量 (S) | 待确认 | 采面煤壁前方 预测钻孔（软分层内，孔深8~10m，距煤壁5m） | prediction-borehole-5m | 2AA3, 2698, 269C | inferred_from_existing_mock_anchor |
| 23 | S-DRILL-S-002 | 钻屑量 (S) | kg/m | 采面煤壁前方 预测钻孔（软分层内，孔深8~10m，距煤壁10m） | prediction-borehole-10m | 2AA3, 2698, 269C | inferred_from_geometry |
| 24 | S-DEF-001 | 巷道围岩变形量 | mm | 运输巷超前支护段0~20m（顶板） | transport-advance-0-20-roof | 2A76, 2B2D, 2B55 | inferred_from_named_risk_marker |
| 25 | S-DEF-002 | 巷道围岩变形量 | mm | 运输巷超前支护段20~50m（顶板） | transport-advance-20-50-roof | 26A6 | inferred_from_geometry |
| 26 | S-DEF-003 | 巷道围岩变形量 | mm | 运输巷超前支护段0~20m（两帮） | transport-advance-0-20-ribs | 26A6, 2666, 26D3 | inferred_from_geometry |
| 27 | S-DEF-004 | 巷道围岩变形量 | mm | 回风巷超前支护段0~20m（两帮） | return-advance-0-20-ribs | 2AA3, 265E, 26AB | inferred_from_geometry |
| 28 | S-GASP-001 | 煤层原始瓦斯压力 | MPa | 运输巷原始煤体测压孔（距工作面>100m） | transport-pressure-hole | 26A6, 26CB, 2676 | inferred_from_geometry |
| 29 | S-GASP-002 | 煤层原始瓦斯压力 | MPa | 回风巷原始煤体测压孔（距工作面>100m） | return-pressure-hole | 2AA3, 264C, 26B3 | inferred_from_geometry |
| 30 | S-GASP-003 | 煤层原始瓦斯压力 | MPa | 地质构造异常区测压孔 | geological-anomaly-pressure-hole | 2AA3, 263E, 26A0 | low_needs_domain_confirmation |
| 31 | S-GASP-TREND-001 | 煤层瓦斯压力波动趋势 | MPa/h | 运输巷原始煤体测压孔（距工作面>100m） | transport-pressure-hole | 26A6, 26CB, 2676 | inferred_from_geometry |
| 32 | S-GASP-TREND-002 | 煤层瓦斯压力波动趋势 | MPa/h | 回风巷原始煤体测压孔（距工作面>100m） | return-pressure-hole | 2AA3, 264C, 26B3 | inferred_from_geometry |
| 33 | S-GASP-TREND-003 | 煤层瓦斯压力波动趋势 | MPa/h | 地质构造异常区测压孔 | geological-anomaly-pressure-hole | 2AA3, 263E, 26A0 | low_needs_domain_confirmation |
| 34 | S-Q-001 | 钻孔瓦斯涌出初速度 (q) | L/min | 采面煤壁前方 预测钻孔（软分层内，孔深8~10m，封孔后测量） | prediction-borehole-5m | 2AA3, 2698, 269C | inferred_from_existing_mock_anchor |
| 35 | S-K1-001 | 钻屑瓦斯解吸指标 (K₁) | mL/(g·min^0.5) | 采面煤壁前方 预测钻孔（取钻屑后立即装入解吸仪测量） | prediction-borehole-5m | 2AA3, 2698, 269C | inferred_from_existing_mock_anchor |
| 36 | S-CH4-RATE-001 | 瓦斯浓度变化率 | %/min | 采面回风 | return-airway-near-face | 2AA3, 265A, 26AF | inferred_from_existing_mock_anchor |
| 37 | S-CH4-RATE-002 | 瓦斯浓度变化率 | %/min | 采面上隅角 | working-face-upper-corner | 2AA3, 263E, 26A0 | inferred_from_existing_mock_anchor |
| 38 | S-CH4-RATE-003 | 瓦斯浓度变化率 | %/min | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 39 | S-GAS-FLOW-K-001 | 瓦斯涌出量波动系数 | dimensionless | 采面回风管道 | return-pipe | 2615, 2611, 2A7B | inferred_from_pipe_handles |
| 40 | S-COAL-TEMP-001 | 煤体内部温度变化 | °C | 采面煤壁前方 钻孔内 | prediction-borehole-5m | 2AA3, 2698, 269C | inferred_from_existing_mock_anchor |
| 41 | S-EMR-I-001 | 电磁辐射强度 | mV | 工作面煤壁前方5m（移动测点1） | emr-mobile-5m | 2AA3, 26B7, 26BB | inferred_from_geometry |
| 42 | S-EMR-I-002 | 电磁辐射强度 | mV | 工作面煤壁前方10m（移动测点2） | emr-mobile-10m | 2AA3, 264C, 26B3 | inferred_from_geometry |
| 43 | S-EMR-P-001 | 电磁辐射脉冲数 | count | 工作面煤壁前方5m（移动测点3） | emr-mobile-5m | 2AA3, 26B7, 26BB | inferred_from_geometry |
| 44 | S-EMR-P-002 | 电磁辐射脉冲数 | count | 工作面煤壁前方10m（移动测点4） | emr-mobile-10m | 2AA3, 264C, 26B3 | inferred_from_geometry |
| 45 | S-AE-RATE-001 | 声发射事件率 | events/min | 运输巷底板钻孔（深度5m） | transport-floor-borehole | 26A6, 2672, 26BF | inferred_from_geometry |
| 46 | S-AE-RATE-002 | 声发射事件率 | events/min | 回风巷底板钻孔（深度5m） | return-floor-borehole | 2AA3, 265A, 26AF | inferred_from_geometry |
| 47 | S-AE-DA12-001 | 声发射12h偏差值（DA） | dimensionless | 运输巷底板钻孔（深度5m） | transport-floor-borehole | 26A6, 2672, 26BF | inferred_from_geometry |
| 48 | S-AE-DA13-001 | 声发射13h偏差值（DA） | dimensionless | 回风巷底板钻孔（深度5m） | return-floor-borehole | 2AA3, 265A, 26AF | inferred_from_geometry |
| 49 | S-AE-N-001 | 声发射异常频次（N） | count | 运输巷底板钻孔（深度5m） | transport-floor-borehole | 26A6, 2672, 26BF | inferred_from_geometry |
| 50 | S-AE-N-002 | 声发射异常频次（N） | count | 回风巷底板钻孔（深度5m） | return-floor-borehole | 2AA3, 265A, 26AF | inferred_from_geometry |
| 51 | S-MS-FREQ-001 | 微震事件频次 | events/h | 运输巷顶板钻孔（深度3m） | transport-roof-borehole | 2A76, 2B2D, 26CF | inferred_from_geometry |
| 52 | S-MS-FREQ-002 | 微震事件频次 | events/h | 回风巷顶板钻孔（深度3m） | return-roof-borehole | 2AA3, 265E, 26AB | inferred_from_geometry |
| 53 | S-MS-FREQ-003 | 微震事件频次 | events/h | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 | low_needs_cad_label_confirmation |
| 54 | S-MS-FREQ-004 | 微震事件频次 | events/h | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 | low_needs_cad_label_confirmation |
| 55 | S-MS-ENERGY-001 | 微震事件能量 | J | 运输巷顶板钻孔（深度3m） | transport-roof-borehole | 2A76, 2B2D, 26CF | inferred_from_geometry |
| 56 | S-MS-ENERGY-002 | 微震事件能量 | J | 回风巷顶板钻孔（深度3m） | return-roof-borehole | 2AA3, 265E, 26AB | inferred_from_geometry |
| 57 | S-MS-ENERGY-003 | 微震事件能量 | J | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 | low_needs_cad_label_confirmation |
| 58 | S-MS-ENERGY-004 | 微震事件能量 | J | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 | low_needs_cad_label_confirmation |
| 59 | S-MS-B-001 | 微震 b 值 | dimensionless | 运输巷顶板钻孔（深度3m） | transport-roof-borehole | 2A76, 2B2D, 26CF | inferred_from_geometry |
| 60 | S-MS-B-002 | 微震 b 值 | dimensionless | 回风巷顶板钻孔（深度3m） | return-roof-borehole | 2AA3, 265E, 26AB | inferred_from_geometry |
| 61 | S-MS-B-003 | 微震 b 值 | dimensionless | 切眼两端顶板钻孔 | setup-entry-cut-eye-roof | 2A7B, 2603, 2611 | low_needs_cad_label_confirmation |
| 62 | S-MS-B-004 | 微震 b 值 | dimensionless | 采空区侧巷道顶板钻孔 | gob-side-roof-borehole | 2AA3, 261A, 261E, 2622 | low_needs_cad_label_confirmation |
