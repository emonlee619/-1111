export type SceneVector = [number, number, number];

export type TwinDisplayLayer =
  | "ventilation_3d"
  | "pipe_3d"
  | "sensors_panel"
  | "heatmap_only"
  | "data_model_only"
  | "model_extension_required"
  | "low_confidence_pending";

export type TwinMetricStatus = "normal" | "warning" | "danger" | "offline";

export type TwinSensorPoint = {
  id: string;
  anchorId: string;
  label: string;
  shortLabel: string;
  type: string;
  displayLayer: TwinDisplayLayer;
  status: "online" | "warning" | "maintenance";
  metrics: Array<{
    sensorId: string;
    label: string;
    value: string;
    unit: string;
    status: TwinMetricStatus;
  }>;
  relatedHandles: string[];
  description: string;
  anchor: SceneVector;
};

export type TwinRiskMarker = {
  id: string;
  label: string;
  shortLabel: string;
  level: "一般" | "较大" | "重大";
  description: string;
  anchor: SceneVector;
  relatedHandle: string;
};

export const twinTunnelModel = {
  glbUrl: "/models/twin/longwall_digital_twin.glb",
  metadataUrl: "/models/twin/3dmodel-metadata.json",
  sourceFile: "longwall_digital_twin.glb",
  conversionNote: "综采工作面数字孪生模型，包含运输巷、回风巷、工作面、采空区、未采煤体、设备和监测点。",
  scale: 1,
  center: [0, 75, 1.5] as SceneVector,
};

export function toScenePoint(point: SceneVector): SceneVector {
  const [cx, cy, cz] = twinTunnelModel.center;
  const scale = twinTunnelModel.scale;
  return [(point[0] - cx) * scale, (point[1] - cy) * scale, (point[2] - cz) * scale];
}

export const twinSensorPoints: TwinSensorPoint[] = [
  {
    id: "ANCHOR-WF-UPPER-CORNER",
    anchorId: "working-face-upper-corner",
    label: "采面上隅角",
    shortLabel: "上隅角",
    type: "通风气体",
    displayLayer: "ventilation_3d",
    status: "warning",
    metrics: [
      { sensorId: "S-CH4-001", label: "甲烷", value: "0.86", unit: "%", status: "warning" },
      { sensorId: "S-CH4-RATE-002", label: "瓦斯浓度变化率", value: "0.018", unit: "%/min", status: "warning" },
    ],
    relatedHandles: ["UPPER_CORNER"],
    description: "采面回风侧上隅角通风瓦斯聚集演示锚点。",
    anchor: [-1, 148, 2.5],
  },
  {
    id: "ANCHOR-WF-MID",
    anchorId: "working-face-mid",
    label: "采面工作面",
    shortLabel: "采面",
    type: "通风气体",
    displayLayer: "ventilation_3d",
    status: "online",
    metrics: [
      { sensorId: "S-CH4-002", label: "甲烷", value: "0.54", unit: "%", status: "normal" },
      { sensorId: "S-O2-001", label: "氧气", value: "20.6", unit: "%", status: "normal" },
      { sensorId: "S-DUST-001", label: "粉尘", value: "6.8", unit: "mg/m3", status: "normal" },
      { sensorId: "S-AIRDIR-001", label: "风向", value: "回风侧", unit: "", status: "normal" },
    ],
    relatedHandles: ["LONGWALL_FACE"],
    description: "工作面中部通风环境锚点，用于展示气体、粉尘和风向的组合状态。",
    anchor: [-3, 75, 1.5],
  },
  {
    id: "ANCHOR-RETURN-AIRWAY",
    anchorId: "return-airway-near-face",
    label: "采面回风",
    shortLabel: "回风",
    type: "通风气体",
    displayLayer: "ventilation_3d",
    status: "warning",
    metrics: [
      { sensorId: "S-CH4-003", label: "甲烷", value: "0.78", unit: "%", status: "warning" },
      { sensorId: "S-CO-001", label: "一氧化碳", value: "18", unit: "ppm", status: "normal" },
      { sensorId: "S-TEMP-001", label: "温度", value: "28.4", unit: "C", status: "normal" },
      { sensorId: "S-AIRSPD-001", label: "风速", value: "2.1", unit: "m/s", status: "normal" },
      { sensorId: "S-CH4-RATE-001", label: "瓦斯浓度变化率", value: "0.015", unit: "%/min", status: "warning" },
    ],
    relatedHandles: ["TUNNEL_RETURN"],
    description: "采面近端回风巷通风状态锚点，承载甲烷、CO、温度、风速和瓦斯变化率。",
    anchor: [-5, 150, 1.75],
  },
  {
    id: "ANCHOR-INTAKE-SIDE",
    anchorId: "intake-side-near-face",
    label: "采面进风侧",
    shortLabel: "进风",
    type: "通风气体",
    displayLayer: "ventilation_3d",
    status: "online",
    metrics: [{ sensorId: "S-CH4-005", label: "甲烷", value: "0.32", unit: "%", status: "normal" }],
    relatedHandles: ["TUNNEL_TRANSPORT"],
    description: "采面进风侧甲烷复核锚点，用于和回风侧数据形成通风对照。",
    anchor: [-5, 0, 1.75],
  },
  {
    id: "ANCHOR-CUT-EYE",
    anchorId: "setup-entry-cut-eye",
    label: "采面切眼侧",
    shortLabel: "切眼",
    type: "通风气体",
    displayLayer: "ventilation_3d",
    status: "online",
    metrics: [{ sensorId: "S-CH4-004", label: "甲烷", value: "0.47", unit: "%", status: "normal" }],
    relatedHandles: ["CUT_EYE_SIDE"],
    description: "切眼侧甲烷展示锚点。",
    anchor: [50, 75, 1.5],
  },
  {
    id: "ANCHOR-RETURN-BURIED-PIPE",
    anchorId: "return-buried-pipe",
    label: "回风埋管管道",
    shortLabel: "管路 A",
    type: "管路监测",
    displayLayer: "pipe_3d",
    status: "warning",
    metrics: [
      { sensorId: "S-CH4-007", label: "甲烷", value: "1.12", unit: "%", status: "warning" },
      { sensorId: "S-TEMP-002", label: "温度", value: "31.2", unit: "C", status: "normal" },
      { sensorId: "S-PRESS-001", label: "压力", value: "68", unit: "kPa", status: "warning" },
      { sensorId: "S-FLOW-001", label: "流量", value: "42", unit: "m3/min", status: "normal" },
    ],
    relatedHandles: ["GOAF_BURIED_PIPE"],
    description: "回风侧埋管管道监测锚点。",
    anchor: [-30, 148, 1.0],
  },
  {
    id: "ANCHOR-RETURN-PIPE",
    anchorId: "return-pipe",
    label: "回风管道",
    shortLabel: "管路 B",
    type: "管路监测",
    displayLayer: "pipe_3d",
    status: "warning",
    metrics: [
      { sensorId: "S-CH4-008", label: "甲烷", value: "1.05", unit: "%", status: "warning" },
      { sensorId: "S-TEMP-003", label: "温度", value: "30.6", unit: "C", status: "normal" },
      { sensorId: "S-PRESS-002", label: "压力", value: "71", unit: "kPa", status: "warning" },
      { sensorId: "S-FLOW-002", label: "流量", value: "45", unit: "m3/min", status: "normal" },
      { sensorId: "S-CH4-RATE-003", label: "瓦斯浓度变化率", value: "0.021", unit: "%/min", status: "warning" },
      { sensorId: "S-GAS-FLOW-K-001", label: "瓦斯涌出量波动系数", value: "1.18", unit: "", status: "warning" },
    ],
    relatedHandles: ["RETURN_GAS_PIPE_MAIN"],
    description: "回风管道监测锚点。",
    anchor: [50, 150, 2.0],
  },
];

export const twinRiskMarkers: TwinRiskMarker[] = [
  {
    id: "RISK-UPPER-CORNER",
    label: "上隅角瓦斯积聚区",
    shortLabel: "高风险",
    level: "重大",
    description: "上隅角是瓦斯容易积聚的关键位置，需重点监测。",
    anchor: [-1, 148, 2.5],
    relatedHandle: "UPPER_CORNER",
  },
  {
    id: "RISK-GOAF",
    label: "采空区高风险区",
    shortLabel: "采空区",
    level: "较大",
    description: "采空区瓦斯来源，需关注瓦斯抽采效果。",
    anchor: [-30, 75, 1.5],
    relatedHandle: "GOAF_AREA",
  },
  {
    id: "RISK-UNMINED",
    label: "未采煤体应力区",
    shortLabel: "未采区",
    level: "一般",
    description: "煤壁前方待采区域，需监测应力变化。",
    anchor: [60, 75, 1.5],
    relatedHandle: "UNMINED_COAL_BODY",
  },
];