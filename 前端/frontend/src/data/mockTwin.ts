import { twinSnapshotSchema } from "@/schemas/businessSchemas";
import type { TwinSnapshot } from "@/types/business";
import { mockRealChannels } from "./mockMonitoring";

export const mockTwin = twinSnapshotSchema.parse({
  tunnelSegments: [
    { label: "巷道示意", value: "东翼回风巷 -> 中部采掘区 -> 西翼运输巷", hint: "静态示意，不加载真实三维资产" },
    { label: "空间态势", value: "4 个风险标注", hint: "mock 风险点" },
    { label: "视角控制", value: "轻量视图控件", hint: "不做真实三维渲染" },
  ],
  heatmapCells: [
    { id: "HM-01", regionName: "东翼回风巷", riskLevel: "high", riskPoint: "瓦斯波动热区" },
    { id: "HM-02", regionName: "中部采掘区", riskLevel: "normal", riskPoint: "钻孔压力关注区" },
    { id: "HM-03", regionName: "西翼运输巷", riskLevel: "low", riskPoint: "常规巡检区" },
  ],
  sensorPoints: mockRealChannels.slice(0, 8),
  spatialZones: [
    { id: "TWIN-ZONE-01", label: "主斜井", role: "入风与运输主通道", status: "通风稳定", riskLevel: "low", x: 18, y: 64 },
    { id: "TWIN-ZONE-02", label: "西翼运输巷", role: "皮带运输与巡检", status: "点位在线", riskLevel: "low", x: 35, y: 55 },
    { id: "TWIN-ZONE-03", label: "中部采掘区", role: "采掘作业面联络", status: "压力关注", riskLevel: "normal", x: 53, y: 42 },
    { id: "TWIN-ZONE-04", label: "1213采掘工作面", role: "重点作业面", status: "瓦斯复核", riskLevel: "high", x: 67, y: 34 },
    { id: "TWIN-ZONE-05", label: "东翼回风巷", role: "回风与瓦斯汇集", status: "热区跟踪", riskLevel: "high", x: 78, y: 48 },
    { id: "TWIN-ZONE-06", label: "回风联络巷", role: "回风调节", status: "风门联动正常", riskLevel: "normal", x: 62, y: 68 },
  ],
  ventilationFlows: [
    { id: "TWIN-FLOW-01", label: "入风流线", from: "主斜井", to: "西翼运输巷", volume: "1,760 m³/min", status: "稳定", x1: 18, y1: 64, x2: 35, y2: 55 },
    { id: "TWIN-FLOW-02", label: "采掘供风", from: "西翼运输巷", to: "1213采掘工作面", volume: "1,240 m³/min", status: "关注", x1: 35, y1: 55, x2: 67, y2: 34 },
    { id: "TWIN-FLOW-03", label: "回风流线", from: "1213采掘工作面", to: "东翼回风巷", volume: "1,580 m³/min", status: "复核", x1: 67, y1: 34, x2: 78, y2: 48 },
    { id: "TWIN-FLOW-04", label: "联络回风", from: "中部采掘区", to: "回风联络巷", volume: "860 m³/min", status: "稳定", x1: 53, y1: 42, x2: 62, y2: 68 },
  ],
  patrolStates: [
    { label: "最近巡检", value: "09:12 主斜井", hint: "巡检组一 / 已回传" },
    { label: "异常复核", value: "2 处", hint: "瓦斯热区、钻孔压力" },
    { label: "在线点位", value: "7/8", hint: "1 个维护中点位" },
    { label: "空间边界", value: "mock", hint: "不加载真实矿井模型" },
  ],
}) as TwinSnapshot;
