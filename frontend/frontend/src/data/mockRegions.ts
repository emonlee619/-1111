import { regionDetailSchema, regionRiskSummarySchema } from "@/schemas/businessSchemas";
import type { RegionDetail, RegionRiskSummary } from "@/types/business";
import { mockUpdatedAt } from "./mockConstants";

export const mockRegions = [
  { regionId: "R-EAST", regionName: "东翼回风巷", riskLevel: "high", hazardCount: 4, warningCount: 3, updatedAt: mockUpdatedAt, controlStatus: "重点管控" },
  { regionId: "R-MID", regionName: "中部采掘区", riskLevel: "normal", hazardCount: 3, warningCount: 2, updatedAt: mockUpdatedAt, controlStatus: "闭环推进" },
  { regionId: "R-WEST", regionName: "西翼运输巷", riskLevel: "low", hazardCount: 1, warningCount: 1, updatedAt: mockUpdatedAt, controlStatus: "常规巡检" },
].map((region) => regionRiskSummarySchema.parse(region)) as RegionRiskSummary[];

export const mockRegionDetail = regionDetailSchema.parse({
  ...mockRegions[0],
  relatedSensors: ["REAL-01", "REAL-02", "REAL-06", "REAL-12", "REAL-13"],
  relatedHazards: ["HZ-001 风门联锁检查", "HZ-004 钻孔压力复核"],
  controlMeasures: ["加强回风巷巡检频次", "复核瓦斯与风压通道校验状态", "同步更新风险告知卡"],
  warningHistory: [
    { time: "2026-06-26", title: "一般预警", description: "风速扰动 mock 事件已闭环。", tone: "success" },
    { time: "2026-06-27", title: "较大预警", description: "当前待人工复核。", tone: "warning" },
  ],
}) as RegionDetail;
