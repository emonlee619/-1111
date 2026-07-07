from __future__ import annotations

import json
import math
import re
from collections import Counter
from datetime import date
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
EXCEL_PATH = ROOT / "动态-6-10.xlsx"
METADATA_PATH = FRONTEND / "public" / "models" / "twin" / "3dmodel-metadata.json"
JSON_OUT = FRONTEND / "src" / "data" / "twinSensorMappingDraft.json"
MD_OUT = ROOT / "docs" / "frontend-sensor-anchor-mapping-draft.md"

VIEWER_CENTER = [885.3442701935585, 1675.8169023836674, 93.76929328940754]
VIEWER_SCALE = 0.01


SOURCES = [
    {
        "name": "Coal Mine Safety Regulations, methane sensor locations",
        "url": "https://xxgk.jl.gov.cn/gljg/jgsw_98132/zcfg/202207/P020220704556136075804.pdf",
        "use": "Chinese regulatory basis for methane sensors at working face, return airway, return corner, intake airway for outburst mines, return airway middle, and gas drainage pipelines.",
    },
    {
        "name": "30 CFR Part 75 Subpart D, Ventilation",
        "url": "https://www.ecfr.gov/current/title-30/chapter-I/subchapter-O/part-75/subpart-D",
        "use": "US regulatory reference for longwall methane monitor placement near the working face and return-air end.",
    },
    {
        "name": "NIOSH Mining Ventilation Overview",
        "url": "https://archive.cdc.gov/www_cdc_gov/niosh/mining/topics/ventilation.html",
        "use": "Ventilation and methane-control context for longwall face and tailgate-corner accumulation.",
    },
    {
        "name": "National Academies longwall ventilation plan description",
        "url": "https://www.nationalacademies.org/read/25111/chapter/14",
        "use": "Longwall structure basis: intake through headgate/transport entries, air traverses the face, return through tailgate entries.",
    },
]


ANCHORS = {
    "working-face-mid": {
        "label": "采面工作面",
        "zone": "采面",
        "cadPosition": [899.516, 1732.059, 87.234],
        "relatedHandles": ["2AA3"],
        "role": "longwall face / main roadway segment",
        "confidence": "inferred_from_geometry",
    },
    "working-face-upper-corner": {
        "label": "采面上隅角",
        "zone": "采面回风侧",
        "cadPosition": [822.282, 1876.874, 125.498],
        "relatedHandles": ["2AA3", "263E", "26A0"],
        "role": "return-side upper corner on main roadway",
        "confidence": "inferred_from_existing_mock_anchor",
    },
    "return-airway-near-face": {
        "label": "采面回风",
        "zone": "回风巷",
        "cadPosition": [969.515, 1800.481, 108.363],
        "relatedHandles": ["2AA3", "265A", "26AF"],
        "role": "tailgate / return airway near face",
        "confidence": "inferred_from_existing_mock_anchor",
    },
    "intake-side-near-face": {
        "label": "采面进风侧",
        "zone": "进风侧",
        "cadPosition": [792.667, 1363.489, 1.053],
        "relatedHandles": ["26A6", "266E", "26C7"],
        "role": "headgate / transport-side intake approach",
        "confidence": "inferred_from_existing_mock_anchor",
    },
    "setup-entry-cut-eye": {
        "label": "采面切眼侧",
        "zone": "切眼",
        "cadPosition": [708.876, 1301.08, 171.0],
        "relatedHandles": ["2A76", "2B2D", "2B55"],
        "role": "setup-entry / support plate area",
        "confidence": "inferred_from_geometry",
    },
    "return-buried-pipe": {
        "label": "采面回风埋管管道",
        "zone": "回风管路",
        "cadPosition": [798.318, 2098.563, 181.2],
        "relatedHandles": ["260D", "2608", "2603", "2A7B"],
        "role": "buried drainage pipe at return-side upper structure",
        "confidence": "inferred_from_pipe_handles",
    },
    "return-pipe": {
        "label": "采面回风管道",
        "zone": "回风管路",
        "cadPosition": [814.318, 2098.563, 181.2],
        "relatedHandles": ["2615", "2611", "2A7B"],
        "role": "return drainage pipe at return-side upper structure",
        "confidence": "inferred_from_pipe_handles",
    },
    "return-high-drill-rig": {
        "label": "采面回风高位钻机",
        "zone": "回风高位钻孔",
        "cadPosition": [812.0, 2118.0, 176.0],
        "relatedHandles": ["2A7B", "2603", "2608", "2611", "2615"],
        "role": "high-level return-side drilling/drainage platform",
        "confidence": "low_needs_cad_label_confirmation",
    },
    "return-refuge-chamber": {
        "label": "采面回风巷避险硐室",
        "zone": "回风巷",
        "cadPosition": [717.353, 1318.755, 97.984],
        "relatedHandles": ["26A6", "2A76"],
        "role": "refuge/chamber-like point near low intersection and support plate",
        "confidence": "low_needs_cad_label_confirmation",
    },
    "prediction-borehole-5m": {
        "label": "采面煤壁前方预测钻孔 5m",
        "zone": "预测钻孔",
        "cadPosition": [871.508, 1573.295, 52.902],
        "relatedHandles": ["2AA3", "2698", "269C"],
        "role": "working-face front borehole, 5m offset",
        "confidence": "inferred_from_existing_mock_anchor",
    },
    "prediction-borehole-10m": {
        "label": "采面煤壁前方预测钻孔 10m",
        "zone": "预测钻孔",
        "cadPosition": [889.0, 1644.857, 70.471],
        "relatedHandles": ["2AA3", "2698", "269C"],
        "role": "working-face front borehole, 10m offset",
        "confidence": "inferred_from_geometry",
    },
    "transport-advance-0-20-roof": {
        "label": "运输巷超前支护段 0-20m 顶板",
        "zone": "运输巷",
        "cadPosition": [708.876, 1301.08, 171.0],
        "relatedHandles": ["2A76", "2B2D", "2B55"],
        "role": "roof support plate / near transport advance support",
        "confidence": "inferred_from_named_risk_marker",
    },
    "transport-advance-20-50-roof": {
        "label": "运输巷超前支护段 20-50m 顶板",
        "zone": "运输巷",
        "cadPosition": [821.202, 1310.931, 79.053],
        "relatedHandles": ["26A6"],
        "role": "lower roadway intersection, farther advance-support interval",
        "confidence": "inferred_from_geometry",
    },
    "transport-advance-0-20-ribs": {
        "label": "运输巷超前支护段 0-20m 两帮",
        "zone": "运输巷",
        "cadPosition": [717.353, 1318.755, 97.984],
        "relatedHandles": ["26A6", "2666", "26D3"],
        "role": "sidewall on transport approach",
        "confidence": "inferred_from_geometry",
    },
    "return-advance-0-20-ribs": {
        "label": "回风巷超前支护段 0-20m 两帮",
        "zone": "回风巷",
        "cadPosition": [929.015, 1841.743, 118.696],
        "relatedHandles": ["2AA3", "265E", "26AB"],
        "role": "sidewall on return approach",
        "confidence": "inferred_from_geometry",
    },
    "transport-pressure-hole": {
        "label": "运输巷原始煤体测压孔",
        "zone": "运输巷",
        "cadPosition": [715.118, 1205.931, 0.053],
        "relatedHandles": ["26A6", "26CB", "2676"],
        "role": "transport-side pressure borehole beyond face",
        "confidence": "inferred_from_geometry",
    },
    "return-pressure-hole": {
        "label": "回风巷原始煤体测压孔",
        "zone": "回风巷",
        "cadPosition": [861.635, 1966.026, 145.577],
        "relatedHandles": ["2AA3", "264C", "26B3"],
        "role": "return-side pressure borehole beyond face",
        "confidence": "inferred_from_geometry",
    },
    "geological-anomaly-pressure-hole": {
        "label": "地质构造异常区测压孔",
        "zone": "构造异常区",
        "cadPosition": [837.434, 1811.07, 111.763],
        "relatedHandles": ["2AA3", "263E", "26A0"],
        "role": "abnormal structure monitoring point on main long segment",
        "confidence": "low_needs_domain_confirmation",
    },
    "emr-mobile-5m": {
        "label": "工作面煤壁前方 5m 移动测点",
        "zone": "预测钻孔",
        "cadPosition": [866.5, 1908.8, 133.0],
        "relatedHandles": ["2AA3", "26B7", "26BB"],
        "role": "mobile electromagnetic point, 5m offset",
        "confidence": "inferred_from_geometry",
    },
    "emr-mobile-10m": {
        "label": "工作面煤壁前方 10m 移动测点",
        "zone": "预测钻孔",
        "cadPosition": [866.5, 1966.0, 146.0],
        "relatedHandles": ["2AA3", "264C", "26B3"],
        "role": "mobile electromagnetic point, 10m offset",
        "confidence": "inferred_from_geometry",
    },
    "transport-floor-borehole": {
        "label": "运输巷底板钻孔",
        "zone": "运输巷",
        "cadPosition": [701.5, 1327.01, 0.053],
        "relatedHandles": ["26A6", "2672", "26BF"],
        "role": "floor borehole on transport roadway",
        "confidence": "inferred_from_geometry",
    },
    "return-floor-borehole": {
        "label": "回风巷底板钻孔",
        "zone": "回风巷",
        "cadPosition": [914.25, 1865.5, 119.873],
        "relatedHandles": ["2AA3", "265A", "26AF"],
        "role": "floor borehole on return roadway",
        "confidence": "inferred_from_geometry",
    },
    "transport-roof-borehole": {
        "label": "运输巷顶板钻孔",
        "zone": "运输巷",
        "cadPosition": [728.0, 1278.0, 171.0],
        "relatedHandles": ["2A76", "2B2D", "26CF"],
        "role": "roof borehole on transport roadway",
        "confidence": "inferred_from_geometry",
    },
    "return-roof-borehole": {
        "label": "回风巷顶板钻孔",
        "zone": "回风巷",
        "cadPosition": [929.0, 1841.7, 119.0],
        "relatedHandles": ["2AA3", "265E", "26AB"],
        "role": "roof borehole on return roadway",
        "confidence": "inferred_from_geometry",
    },
    "setup-entry-cut-eye-roof": {
        "label": "切眼两端顶板钻孔",
        "zone": "切眼",
        "cadPosition": [812.0, 2118.0, 176.0],
        "relatedHandles": ["2A7B", "2603", "2611"],
        "role": "setup-entry roof at upper plate/pipe area",
        "confidence": "low_needs_cad_label_confirmation",
    },
    "gob-side-roof-borehole": {
        "label": "采空区侧巷道顶板钻孔",
        "zone": "采空区侧",
        "cadPosition": [804.389, 2074.04, 171.0],
        "relatedHandles": ["2AA3", "261A", "261E", "2622"],
        "role": "gob-side roof borehole near return-side upper roadway",
        "confidence": "low_needs_cad_label_confirmation",
    },
}


METRIC_PREFIX = {
    "甲烷": "CH4",
    "一氧化碳": "CO",
    "二氧化碳": "CO2",
    "温度": "TEMP",
    "风速": "AIRSPD",
    "氧气": "O2",
    "压力": "PRESS",
    "粉尘": "DUST",
    "风向": "AIRDIR",
    "流量": "FLOW",
    "钻屑量 (S)": "DRILL-S",
    "巷道围岩变形量": "DEF",
    "煤层原始瓦斯压力": "GASP",
    "煤层瓦斯压力波动趋势": "GASP-TREND",
    "钻孔瓦斯涌出初速度 (q)": "Q",
    "钻屑瓦斯解吸指标 (K₁)": "K1",
    "瓦斯浓度变化率": "CH4-RATE",
    "瓦斯涌出量波动系数": "GAS-FLOW-K",
    "煤体内部温度变化": "COAL-TEMP",
    "电磁辐射强度": "EMR-I",
    "电磁辐射脉冲数": "EMR-P",
    "声发射事件率": "AE-RATE",
    "声发射12h偏差值（DA）": "AE-DA12",
    "声发射13h偏差值（DA）": "AE-DA13",
    "声发射异常频次（N）": "AE-N",
    "微震事件频次": "MS-FREQ",
    "微震事件能量": "MS-ENERGY",
    "微震 b 值": "MS-B",
}


METRIC_GROUP = {
    "甲烷": "gas",
    "一氧化碳": "gas",
    "二氧化碳": "gas",
    "氧气": "gas",
    "瓦斯浓度变化率": "gas",
    "瓦斯涌出量波动系数": "gas",
    "温度": "thermal",
    "煤体内部温度变化": "thermal",
    "风速": "ventilation",
    "风向": "ventilation",
    "压力": "pipe",
    "流量": "pipe",
    "煤层原始瓦斯压力": "borehole-pressure",
    "煤层瓦斯压力波动趋势": "borehole-pressure",
    "钻屑量 (S)": "prediction",
    "钻孔瓦斯涌出初速度 (q)": "prediction",
    "钻屑瓦斯解吸指标 (K₁)": "prediction",
    "巷道围岩变形量": "deformation",
    "电磁辐射强度": "electromagnetic",
    "电磁辐射脉冲数": "electromagnetic",
    "声发射事件率": "acoustic-emission",
    "声发射12h偏差值（DA）": "acoustic-emission",
    "声发射13h偏差值（DA）": "acoustic-emission",
    "声发射异常频次（N）": "acoustic-emission",
    "微震事件频次": "microseismic",
    "微震事件能量": "microseismic",
    "微震 b 值": "microseismic",
    "粉尘": "dust",
}


def scene_position(cad: list[float]) -> list[float]:
    cx, cy, cz = VIEWER_CENTER
    x, y, z = cad
    return [
        round((x - cx) * VIEWER_SCALE, 6),
        round((z - cz) * VIEWER_SCALE, 6),
        round(-(y - cy) * VIEWER_SCALE, 6),
    ]


def clean_text(value: object) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\u00a0", " ")).strip()


def assign_anchor(position: str) -> str:
    p = clean_text(position)
    if "上隅角" in p:
        return "working-face-upper-corner"
    if p == "采面工作面" or p == "采面":
        return "working-face-mid"
    if "采面回风埋管" in p or "采面回风埋管管" in p:
        return "return-buried-pipe"
    if "采面回风管道" in p:
        return "return-pipe"
    if p == "采面回风":
        return "return-airway-near-face"
    if "采面回风高位钻机" in p:
        return "return-high-drill-rig"
    if "切眼侧" in p:
        return "setup-entry-cut-eye"
    if "采面进风侧" in p:
        return "intake-side-near-face"
    if "避险硐室" in p:
        return "return-refuge-chamber"
    if "运输巷超前支护段0~20m" in p and "顶板" in p:
        return "transport-advance-0-20-roof"
    if "运输巷超前支护段20~50m" in p:
        return "transport-advance-20-50-roof"
    if "运输巷超前支护段0~20m" in p and "两帮" in p:
        return "transport-advance-0-20-ribs"
    if "回风巷超前支护段0~20m" in p:
        return "return-advance-0-20-ribs"
    if "运输巷原始煤体测压孔" in p:
        return "transport-pressure-hole"
    if "回风巷原始煤体测压孔" in p:
        return "return-pressure-hole"
    if "地质构造异常区测压孔" in p:
        return "geological-anomaly-pressure-hole"
    if "距煤壁5m" in p or "工作面煤壁前方5m" in p:
        return "prediction-borehole-5m" if "预测钻孔" in p or "钻孔" in p else "emr-mobile-5m"
    if "距煤壁10m" in p or "工作面煤壁前方10m" in p:
        return "prediction-borehole-10m" if "预测钻孔" in p or "钻孔" in p else "emr-mobile-10m"
    if "预测钻孔" in p or "钻孔内" in p:
        return "prediction-borehole-5m"
    if "运输巷底板钻孔" in p:
        return "transport-floor-borehole"
    if "回风巷底板钻孔" in p:
        return "return-floor-borehole"
    if "运输巷顶板钻孔" in p:
        return "transport-roof-borehole"
    if "回风巷顶板钻孔" in p:
        return "return-roof-borehole"
    if "切眼两端顶板钻孔" in p:
        return "setup-entry-cut-eye-roof"
    if "采空区侧巷道顶板钻孔" in p:
        return "gob-side-roof-borehole"
    raise ValueError(f"Unmapped position: {position}")


def default_unit(metric: str, unit: str) -> str:
    if unit:
        return unit
    defaults = {
        "甲烷": "%",
        "一氧化碳": "ppm",
        "二氧化碳": "%",
        "温度": "°C",
        "风速": "m/s",
        "氧气": "%",
        "压力": "kPa",
        "粉尘": "mg/m³",
        "风向": "°",
        "流量": "m³/min",
        "瓦斯浓度变化率": "%/min",
        "瓦斯涌出量波动系数": "dimensionless",
        "煤体内部温度变化": "°C",
        "巷道围岩变形量": "mm",
        "煤层瓦斯压力波动趋势": "MPa/h",
        "电磁辐射强度": "mV",
        "电磁辐射脉冲数": "count",
        "声发射事件率": "events/min",
        "声发射12h偏差值（DA）": "dimensionless",
        "声发射13h偏差值（DA）": "dimensionless",
        "声发射异常频次（N）": "count",
        "微震事件频次": "events/h",
        "微震事件能量": "J",
        "微震 b 值": "dimensionless",
    }
    return defaults.get(metric, "待确认")


def sensor_id(metric: str, counters: Counter[str]) -> str:
    prefix = METRIC_PREFIX.get(metric, "SENSOR")
    counters[prefix] += 1
    return f"S-{prefix}-{counters[prefix]:03d}"


def build() -> dict:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(EXCEL_PATH)
    if not METADATA_PATH.exists():
        raise FileNotFoundError(METADATA_PATH)

    df = pd.read_excel(EXCEL_PATH)
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8-sig"))
    handle_set = {item["handle"] for item in metadata["solids"]}

    anchors = []
    for anchor_id, anchor in ANCHORS.items():
        handles = anchor["relatedHandles"]
        missing = [handle for handle in handles if handle not in handle_set]
        anchors.append(
            {
                "anchorId": anchor_id,
                **anchor,
                "scenePosition": scene_position(anchor["cadPosition"]),
                "handleCheck": "ok" if not missing else f"missing {missing}",
            }
        )

    counters: Counter[str] = Counter()
    sensors = []
    for idx, row in df.iterrows():
        metric = clean_text(row.iloc[0])
        unit = clean_text(row.iloc[1])
        position = clean_text(row.iloc[2])
        anchor_id = assign_anchor(position)
        anchor = ANCHORS[anchor_id]
        normalized_unit = default_unit(metric, unit)
        sensors.append(
            {
                "row": int(idx + 1),
                "sensorId": sensor_id(metric, counters),
                "metric": metric,
                "metricGroup": METRIC_GROUP.get(metric, "other"),
                "unitFromExcel": unit,
                "unitDraft": normalized_unit,
                "sourcePosition": position,
                "anchorId": anchor_id,
                "anchorLabel": anchor["label"],
                "normalizedZone": anchor["zone"],
                "cadPosition": anchor["cadPosition"],
                "scenePosition": scene_position(anchor["cadPosition"]),
                "relatedHandles": anchor["relatedHandles"],
                "primaryHandle": anchor["relatedHandles"][0],
                "mappingConfidence": anchor["confidence"],
                "valueBoundary": "real_location_from_excel_mock_value_pending_live_data",
                "confirmationNeeded": anchor["confidence"].startswith("low") or unit == "",
                "mappingReason": f"Position text matched {anchor['label']} / {anchor['role']}.",
            }
        )

    return {
        "generatedAt": date.today().isoformat(),
        "sourceWorkbook": str(EXCEL_PATH.name),
        "sourceModel": metadata["source"],
        "modelConversion": metadata["conversion"],
        "viewerTransform": {"center": VIEWER_CENTER, "scale": VIEWER_SCALE, "axis": "scene=[x-cx,z-cz,-(y-cy)]*scale"},
        "basisSources": SOURCES,
        "counts": {
            "excelRows": len(df),
            "anchors": len(anchors),
            "modelHandles": len(handle_set),
            "mappedSensors": len(sensors),
            "lowConfidenceSensors": sum(1 for item in sensors if item["mappingConfidence"].startswith("low")),
        },
        "anchors": anchors,
        "sensors": sensors,
    }


def markdown_table(rows: list[list[str]], headers: list[str]) -> str:
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        out.append("| " + " | ".join(str(cell).replace("\n", " ") for cell in row) + " |")
    return "\n".join(out)


def write_markdown(data: dict) -> None:
    metric_counts = Counter(item["metric"] for item in data["sensors"])
    zone_counts = Counter(item["normalizedZone"] for item in data["sensors"])
    low_conf = [item for item in data["sensors"] if item["mappingConfidence"].startswith("low")]

    anchor_rows = [
        [
            a["anchorId"],
            a["label"],
            a["zone"],
            ", ".join(a["relatedHandles"]),
            a["confidence"],
            a["cadPosition"],
            a["scenePosition"],
        ]
        for a in data["anchors"]
    ]
    sensor_rows = [
        [
            s["row"],
            s["sensorId"],
            s["metric"],
            s["unitDraft"],
            s["sourcePosition"],
            s["anchorId"],
            ", ".join(s["relatedHandles"]),
            s["mappingConfidence"],
        ]
        for s in data["sensors"]
    ]
    metric_rows = [[k, v] for k, v in metric_counts.most_common()]
    zone_rows = [[k, v] for k, v in zone_counts.most_common()]
    low_rows = [
        [s["row"], s["sensorId"], s["metric"], s["sourcePosition"], s["anchorId"], ", ".join(s["relatedHandles"])]
        for s in low_conf
    ]

    body = f"""# 62 点位与三维底模映射草案

日期：{data["generatedAt"]}

## 结论

- 输入表：{data["sourceWorkbook"]}，共 {data["counts"]["excelRows"]} 行。
- 输入模型：{data["sourceModel"]}，当前 GLB 由真实 SAT 拓扑三角化生成，保留 CAD handle。
- 自动生成 {data["counts"]["anchors"]} 个空间锚点，映射 {data["counts"]["mappedSensors"]} 个传感器/监测指标。
- 当前是确认草案：位置来自真实 Excel，三维锚点和 handle 为规则推断；实时数值仍应保持 mock/待接入边界。
- 低置信度点位 {data["counts"]["lowConfidenceSensors"]} 个，主要集中在避险硐室、切眼两端、采空区侧和地质构造异常区，需要结合 CAD 标注或现场布置确认。

## 映射依据

- 长壁通风结构按进风侧/运输侧进入，穿过工作面后由回风侧/回风巷返回；因此“采面进风侧”“运输巷”优先落到低位交汇区 handle 26A6，“采面回风”“回风巷”优先落到主巷道长段 handle 2AA3。
- 采煤工作面、回风巷、回风隅角、回风巷中部、瓦斯抽采输入/输出管路等属于甲烷重点监测位置，因此甲烷、瓦斯变化率、管道压力/流量优先绑定这些空间语义。
- 预测钻孔、测压孔、电磁辐射、声发射、微震点位没有 Excel 坐标，按文字中的“运输巷/回风巷/顶板/底板/5m/10m/切眼/采空区侧”自动归入对应锚点。

## 外部参考

""" + "\n".join(f"- {s['name']}: {s['url']}" for s in data["basisSources"]) + f"""

## 指标数量

{markdown_table(metric_rows, ["指标", "数量"])}

## 空间区段数量

{markdown_table(zone_rows, ["空间区段", "点位数"])}

## 空间锚点草案

{markdown_table(anchor_rows, ["anchorId", "标签", "区段", "关联 handles", "置信度", "CAD 坐标", "Scene 坐标"])}

## 低置信度待确认项

{markdown_table(low_rows, ["Excel 行", "sensorId", "指标", "原始空间位置", "anchorId", "关联 handles"])}

## 62 点位映射明细

{markdown_table(sensor_rows, ["Excel 行", "sensorId", "指标", "单位草案", "原始空间位置", "anchorId", "关联 handles", "置信度"])}
"""
    MD_OUT.write_text(body, encoding="utf-8")


def main() -> None:
    data = build()
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown(data)
    print(json.dumps(data["counts"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
