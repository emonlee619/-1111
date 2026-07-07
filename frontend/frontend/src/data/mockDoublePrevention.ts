import { doublePreventionSnapshotSchema } from "@/schemas/businessSchemas";
import type { DoublePreventionSnapshot, DoublePreventionSourceType, HandlingStatus, MajorHazardCandidate } from "@/types/business";
import type { RiskLevel } from "@/types/risk";

const modelVersion = "DOUBLE-PREVENTION-MOCK-1.0";

function sourceFields({
  triggerSource,
  sourceType,
  relatedChannels,
  supportingRealChannels = [],
  responsiblePerson,
  status,
  needsHumanReview,
  majorHazardCandidate,
  modelScore,
  warningEventId,
  reliabilityWeight,
}: {
  triggerSource: string;
  sourceType: DoublePreventionSourceType;
  relatedChannels: string[];
  supportingRealChannels?: string[];
  responsiblePerson: string;
  status: string;
  needsHumanReview: boolean;
  majorHazardCandidate: MajorHazardCandidate;
  modelScore: number;
  warningEventId?: string;
  reliabilityWeight: number;
}) {
  return {
    triggerSource,
    sourceType,
    relatedChannels,
    supportingRealChannels,
    responsiblePerson,
    status,
    needsHumanReview,
    majorHazardCandidate,
    modelScore,
    modelVersion,
    warningEventId,
    reliabilityWeight,
  };
}

function riskControl(
  id: string,
  name: string,
  riskLevel: RiskLevel,
  regionName: string,
  ownerUnit: string,
  measureSummary: string,
  inspectionFrequency: string,
  fields: Omit<ReturnType<typeof sourceFields>, "status">,
) {
  return { id, name, riskLevel, regionName, ownerUnit, measureSummary, inspectionFrequency, ...fields };
}

function hazard(
  id: string,
  description: string,
  riskLevel: RiskLevel,
  regionName: string,
  ownerUnit: string,
  responsiblePerson: string,
  currentStep: string,
  deadline: string,
  overdueDays: number,
  status: HandlingStatus,
  measureSummary: string,
  fields: ReturnType<typeof sourceFields>,
) {
  return {
    id,
    description,
    riskLevel,
    regionName,
    ...fields,
    owner: responsiblePerson,
    ownerUnit,
    currentStep,
    deadline,
    overdueDays,
    status,
    measureSummary,
  };
}

export const mockDoublePrevention = doublePreventionSnapshotSchema.parse({
  riskControls: [
    riskControl("RC-001", "东翼回风巷瓦斯积聚风险", "high", "东翼回风巷", "通风区", "加强瓦斯浓度、风速与负压联合巡检。", "每班", sourceFields({ triggerSource: "R01/R02/R05 连续抬升", sourceType: "real_sensor", relatedChannels: ["R01", "R02", "R05"], supportingRealChannels: ["R01", "R02", "R05"], responsiblePerson: "通风区值班长", status: "管控中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.82, warningEventId: "EVT-MOCK-001", reliabilityWeight: 1 })),
    riskControl("RC-002", "中部采掘区钻孔压力复核风险", "normal", "中部采掘区", "防突队", "复测钻孔压力并核对作业记录。", "每日", sourceFields({ triggerSource: "R08 压力读数偏移", sourceType: "real_sensor", relatedChannels: ["R08", "R09"], supportingRealChannels: ["R08", "R09"], responsiblePerson: "防突队技术员", status: "待复核", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.58, warningEventId: "EVT-MOCK-002", reliabilityWeight: 1 })),
    riskControl("RC-003", "回采工作面异常耦合辅助预警", "high", "回采工作面", "监测中心", "组织专项复核，不直接下结论。", "实时关注", sourceFields({ triggerSource: "B03/B07/B12 物理约束指标异常", sourceType: "physics_constrained", relatedChannels: ["B03", "B07", "B12"], supportingRealChannels: ["R01", "R06"], responsiblePerson: "监测中心工程师", status: "专项复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.76, warningEventId: "EVT-MOCK-003", reliabilityWeight: 0.62 })),
    riskControl("RC-004", "西翼运输巷静态底板软弱风险", "normal", "西翼运输巷", "地测科", "按静态风险先验调整巡检路线。", "每周", sourceFields({ triggerSource: "S06/S11 静态地质先验", sourceType: "static_prior", relatedChannels: ["S06", "S11"], supportingRealChannels: [], responsiblePerson: "地测科工程师", status: "已纳入管控", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.44, reliabilityWeight: 0.7 })),
    riskControl("RC-005", "主斜井风门闭锁人工检查风险", "high", "主斜井", "通风区", "复核风门闭锁和巡检签认。", "每班", sourceFields({ triggerSource: "人工巡检缺项", sourceType: "manual_check", relatedChannels: ["CHK-VENT-01"], supportingRealChannels: ["R12"], responsiblePerson: "通风区班组长", status: "整改中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.5, reliabilityWeight: 0.9 })),
    riskControl("RC-006", "回风侧管路负压波动风险", "normal", "回风管路 B", "机电队", "检查管路密闭、阀门状态与负压记录。", "每日", sourceFields({ triggerSource: "R13/R14 负压波动", sourceType: "real_sensor", relatedChannels: ["R13", "R14"], supportingRealChannels: ["R13", "R14"], responsiblePerson: "机电队值班员", status: "管控中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.61, warningEventId: "EVT-MOCK-004", reliabilityWeight: 1 })),
    riskControl("RC-007", "采空区邻近扰动辅助预警", "critical", "采空区邻近带", "安全科", "仅触发待复核，不作为撤人或断电依据。", "专项复核", sourceFields({ triggerSource: "B21/B28/B34 物理约束组合", sourceType: "physics_constrained", relatedChannels: ["B21", "B28", "B34"], supportingRealChannels: ["R03", "R04", "R10"], responsiblePerson: "安全副总工程师", status: "待复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.88, warningEventId: "EVT-MOCK-005", reliabilityWeight: 0.58 })),
    riskControl("RC-008", "南翼联络巷静态设施风险", "low", "南翼联络巷", "安全科", "完善风险告知牌和责任牌。", "每月", sourceFields({ triggerSource: "S18 设施台账先验", sourceType: "static_prior", relatedChannels: ["S18"], supportingRealChannels: [], responsiblePerson: "安全科资料员", status: "已纳入管控", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.28, reliabilityWeight: 0.72 })),
  ],
  riskMap: [
    { id: "MAP-01", regionName: "东翼回风巷", riskLevel: "high", riskPoint: "瓦斯-通风扰动", ownerUnit: "通风区", measureSummary: "每班联合巡检。", inspectionFrequency: "每班", ...sourceFields({ triggerSource: "R01/R02", sourceType: "real_sensor", relatedChannels: ["R01", "R02"], supportingRealChannels: ["R01", "R02"], responsiblePerson: "通风区值班长", status: "管控中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.79, reliabilityWeight: 1 }) },
    { id: "MAP-02", regionName: "中部采掘区", riskLevel: "normal", riskPoint: "钻孔压力漂移", ownerUnit: "防突队", measureSummary: "复测钻孔压力。", inspectionFrequency: "每日", ...sourceFields({ triggerSource: "R08/R09", sourceType: "real_sensor", relatedChannels: ["R08", "R09"], supportingRealChannels: ["R08", "R09"], responsiblePerson: "防突队技术员", status: "待复核", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.57, reliabilityWeight: 1 }) },
    { id: "MAP-03", regionName: "西翼运输巷", riskLevel: "low", riskPoint: "常规巡检", ownerUnit: "运输队", measureSummary: "按月检查标识和照明。", inspectionFrequency: "每月", ...sourceFields({ triggerSource: "人工巡检", sourceType: "manual_check", relatedChannels: ["CHK-TRANS-01"], supportingRealChannels: [], responsiblePerson: "运输队班组长", status: "正常巡检", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.2, reliabilityWeight: 0.86 }) },
    { id: "MAP-04", regionName: "回采工作面", riskLevel: "high", riskPoint: "多指标协同异常", ownerUnit: "监测中心", measureSummary: "专项复核 B 类辅助指标。", inspectionFrequency: "实时关注", ...sourceFields({ triggerSource: "B03/B07/B12", sourceType: "physics_constrained", relatedChannels: ["B03", "B07", "B12"], supportingRealChannels: ["R01", "R06"], responsiblePerson: "监测中心工程师", status: "辅助预警", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.76, reliabilityWeight: 0.62 }) },
    { id: "MAP-05", regionName: "采空区邻近带", riskLevel: "critical", riskPoint: "采空区扰动辅助预警", ownerUnit: "安全科", measureSummary: "矿级专项复核。", inspectionFrequency: "专项复核", ...sourceFields({ triggerSource: "B21/B28/B34", sourceType: "physics_constrained", relatedChannels: ["B21", "B28", "B34"], supportingRealChannels: ["R03", "R04"], responsiblePerson: "安全副总工程师", status: "待复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.88, reliabilityWeight: 0.58 }) },
    { id: "MAP-06", regionName: "主斜井", riskLevel: "high", riskPoint: "风门闭锁记录缺项", ownerUnit: "通风区", measureSummary: "补齐闭锁记录和签认。", inspectionFrequency: "每班", ...sourceFields({ triggerSource: "人工检查缺项", sourceType: "manual_check", relatedChannels: ["CHK-VENT-01"], supportingRealChannels: ["R12"], responsiblePerson: "通风区班组长", status: "整改中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.5, reliabilityWeight: 0.9 }) },
    { id: "MAP-07", regionName: "回风管路 B", riskLevel: "normal", riskPoint: "负压波动", ownerUnit: "机电队", measureSummary: "检查密闭和阀门状态。", inspectionFrequency: "每日", ...sourceFields({ triggerSource: "R13/R14", sourceType: "real_sensor", relatedChannels: ["R13", "R14"], supportingRealChannels: ["R13", "R14"], responsiblePerson: "机电队值班员", status: "管控中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.61, reliabilityWeight: 1 }) },
    { id: "MAP-08", regionName: "南翼联络巷", riskLevel: "low", riskPoint: "静态设施风险", ownerUnit: "安全科", measureSummary: "完善告知牌和责任牌。", inspectionFrequency: "每月", ...sourceFields({ triggerSource: "S18", sourceType: "static_prior", relatedChannels: ["S18"], supportingRealChannels: [], responsiblePerson: "安全科资料员", status: "已纳入管控", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.28, reliabilityWeight: 0.72 }) },
  ],
  riskCards: [
    { ...riskControl("CARD-001", "瓦斯积聚风险告知卡", "high", "东翼回风巷", "通风区", "执行瓦斯浓度、风速、风压联合检查。", "每班", sourceFields({ triggerSource: "R01/R02/R05", sourceType: "real_sensor", relatedChannels: ["R01", "R02", "R05"], supportingRealChannels: ["R01", "R02", "R05"], responsiblePerson: "通风区值班长", status: "发布中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.82, reliabilityWeight: 1 })), emergencyAction: "连续抬升时通知值班负责人复核。", relatedHazards: ["HZ-001", "HZ-004"] },
    { ...riskControl("CARD-002", "钻孔压力异常告知卡", "normal", "中部采掘区", "防突队", "复测钻孔压力并核对作业记录。", "每日", sourceFields({ triggerSource: "R08/R09", sourceType: "real_sensor", relatedChannels: ["R08", "R09"], supportingRealChannels: ["R08", "R09"], responsiblePerson: "防突队技术员", status: "发布中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.58, reliabilityWeight: 1 })), emergencyAction: "超过线下阈值时启动人工复核。", relatedHazards: ["HZ-002"] },
    { ...riskControl("CARD-003", "物理约束辅助预警告知卡", "high", "回采工作面", "监测中心", "B 类指标仅触发待复核。", "实时关注", sourceFields({ triggerSource: "B03/B07/B12", sourceType: "physics_constrained", relatedChannels: ["B03", "B07", "B12"], supportingRealChannels: ["R01", "R06"], responsiblePerson: "监测中心工程师", status: "待复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.76, reliabilityWeight: 0.62 })), emergencyAction: "组织专项复核，不直接作为处置命令。", relatedHazards: ["HZ-003", "HZ-007"] },
    { ...riskControl("CARD-004", "静态底板软弱风险告知卡", "normal", "西翼运输巷", "地测科", "按静态风险先验调整巡检路线。", "每周", sourceFields({ triggerSource: "S06/S11", sourceType: "static_prior", relatedChannels: ["S06", "S11"], supportingRealChannels: [], responsiblePerson: "地测科工程师", status: "发布中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.44, reliabilityWeight: 0.7 })), emergencyAction: "现场发现异常时提交流程台账。", relatedHazards: ["HZ-005"] },
    { ...riskControl("CARD-005", "风门闭锁人工检查告知卡", "high", "主斜井", "通风区", "复核闭锁、签认和照片摘要。", "每班", sourceFields({ triggerSource: "人工巡检缺项", sourceType: "manual_check", relatedChannels: ["CHK-VENT-01"], supportingRealChannels: ["R12"], responsiblePerson: "通风区班组长", status: "整改中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.5, reliabilityWeight: 0.9 })), emergencyAction: "缺项补齐前由班组长现场复核。", relatedHazards: ["HZ-004"] },
    { ...riskControl("CARD-006", "采空区扰动专项复核卡", "critical", "采空区邻近带", "安全科", "仅作为专项复核触发依据。", "专项复核", sourceFields({ triggerSource: "B21/B28/B34", sourceType: "physics_constrained", relatedChannels: ["B21", "B28", "B34"], supportingRealChannels: ["R03", "R04", "R10"], responsiblePerson: "安全副总工程师", status: "待复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.88, reliabilityWeight: 0.58 })), emergencyAction: "人工会商确认前不得标记为已确认重大隐患。", relatedHazards: ["HZ-007", "HZ-008"] },
  ],
  measures: [
    { id: "M-001", category: "通风管理", applicableRisk: "瓦斯积聚", executionFrequency: "每班", role: "通风区", checklist: "风门、风筒、风速与负压记录", sourceType: "real_sensor", relatedChannels: ["R01", "R02", "R05"], ownerUnit: "通风区" },
    { id: "M-002", category: "防突复核", applicableRisk: "钻孔压力", executionFrequency: "每日", role: "防突队", checklist: "钻孔压力读数、作业位置、复测摘要", sourceType: "real_sensor", relatedChannels: ["R08", "R09"], ownerUnit: "防突队" },
    { id: "M-003", category: "监测校验", applicableRisk: "通道异常", executionFrequency: "每周", role: "监测中心", checklist: "校验状态、维护记录、异常片段说明", sourceType: "real_sensor", relatedChannels: ["R01", "R03", "R06"], ownerUnit: "监测中心" },
    { id: "M-004", category: "专项复核", applicableRisk: "物理约束辅助预警", executionFrequency: "触发后", role: "监测中心", checklist: "B 类指标、支撑真实通道、人工结论", sourceType: "physics_constrained", relatedChannels: ["B03", "B07", "B12"], ownerUnit: "监测中心" },
    { id: "M-005", category: "矿级会商", applicableRisk: "采空区扰动候选", executionFrequency: "触发后", role: "安全科", checklist: "专项复核记录、现场确认、责任签认", sourceType: "physics_constrained", relatedChannels: ["B21", "B28", "B34"], ownerUnit: "安全科" },
    { id: "M-006", category: "静态风险巡查", applicableRisk: "底板软弱", executionFrequency: "每周", role: "地测科", checklist: "地质先验、现场描述、照片摘要", sourceType: "static_prior", relatedChannels: ["S06", "S11"], ownerUnit: "地测科" },
    { id: "M-007", category: "设施台账维护", applicableRisk: "告知牌缺失", executionFrequency: "每月", role: "安全科", checklist: "告知牌、责任牌、制度牌", sourceType: "static_prior", relatedChannels: ["S18"], ownerUnit: "安全科" },
    { id: "M-008", category: "人工巡检", applicableRisk: "风门闭锁缺项", executionFrequency: "每班", role: "通风区", checklist: "闭锁状态、签认、图片摘要", sourceType: "manual_check", relatedChannels: ["CHK-VENT-01"], ownerUnit: "通风区" },
    { id: "M-009", category: "负压管路检查", applicableRisk: "回风管路波动", executionFrequency: "每日", role: "机电队", checklist: "阀门、密闭、负压记录", sourceType: "real_sensor", relatedChannels: ["R13", "R14"], ownerUnit: "机电队" },
    { id: "M-010", category: "班组宣贯", applicableRisk: "岗位认知不足", executionFrequency: "每周", role: "班组长", checklist: "风险四色、八步闭环、边界说明", sourceType: "manual_check", relatedChannels: ["CHK-TRAIN-01"], ownerUnit: "安全科" },
    { id: "M-011", category: "现场复测", applicableRisk: "辅助指标异常", executionFrequency: "触发后 2 小时内", role: "防突队", checklist: "支撑真实通道复测与记录", sourceType: "physics_constrained", relatedChannels: ["B15", "B18"], ownerUnit: "防突队" },
    { id: "M-012", category: "台账补录", applicableRisk: "材料缺项", executionFrequency: "当班", role: "责任单位", checklist: "整改措施、责任人、期限、当前步骤", sourceType: "manual_check", relatedChannels: ["CHK-LEDGER-01"], ownerUnit: "安全科" },
    { id: "M-013", category: "区域巡检加密", applicableRisk: "静态高风险区域", executionFrequency: "每班", role: "安全员", checklist: "区域风险先验、现场异常、复核结论", sourceType: "static_prior", relatedChannels: ["S22", "S27"], ownerUnit: "安全科" },
    { id: "M-014", category: "传感器支撑复核", applicableRisk: "B 类候选重大隐患", executionFrequency: "触发后", role: "监测中心", checklist: "列出支撑 R 通道，确认不得直接定性", sourceType: "physics_constrained", relatedChannels: ["B31", "B37"], ownerUnit: "监测中心" },
    { id: "M-015", category: "闭环验收", applicableRisk: "隐患销号", executionFrequency: "到期前", role: "安全科", checklist: "措施、责任、期限、验收、审查、销号材料", sourceType: "manual_check", relatedChannels: ["CHK-CLOSE-01"], ownerUnit: "安全科" },
  ],
  hazards: [
    hazard("HZ-001", "东翼回风巷风门联锁状态需复核", "high", "东翼回风巷", "通风区", "通风区值班长", "整改", "2026-07-08", 0, "handling", "复核风门联锁、风速和瓦斯浓度记录。", sourceFields({ triggerSource: "R01/R02/R05", sourceType: "real_sensor", relatedChannels: ["R01", "R02", "R05"], supportingRealChannels: ["R01", "R02", "R05"], responsiblePerson: "通风区值班长", status: "整改中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.82, reliabilityWeight: 1 })),
    hazard("HZ-002", "中部采掘区钻孔压力记录缺少复核摘要", "normal", "中部采掘区", "防突队", "防突队技术员", "反馈", "2026-07-06", 1, "reviewing", "补齐复测摘要与责任签认。", sourceFields({ triggerSource: "R08/R09", sourceType: "real_sensor", relatedChannels: ["R08", "R09"], supportingRealChannels: ["R08", "R09"], responsiblePerson: "防突队技术员", status: "反馈中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.58, reliabilityWeight: 1 })),
    hazard("HZ-003", "回采工作面 B 类辅助指标触发专项复核", "high", "回采工作面", "监测中心", "监测中心工程师", "分析", "2026-07-05", 0, "verifying", "核对支撑真实通道后形成专项复核摘要。", sourceFields({ triggerSource: "B03/B07/B12", sourceType: "physics_constrained", relatedChannels: ["B03", "B07", "B12"], supportingRealChannels: ["R01", "R06"], responsiblePerson: "监测中心工程师", status: "专项复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.76, reliabilityWeight: 0.62 })),
    hazard("HZ-004", "主斜井风门闭锁巡检记录缺少责任人签认", "high", "主斜井", "通风区", "通风区班组长", "整改", "2026-07-03", 2, "handling", "补齐巡检签认并由班组长复核。", sourceFields({ triggerSource: "人工巡检缺项", sourceType: "manual_check", relatedChannels: ["CHK-VENT-01"], supportingRealChannels: ["R12"], responsiblePerson: "通风区班组长", status: "整改中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.5, reliabilityWeight: 0.9 })),
    hazard("HZ-005", "西翼运输巷底板软弱静态先验需纳入巡检", "normal", "西翼运输巷", "地测科", "地测科工程师", "通报", "2026-07-10", 0, "pending", "把静态风险先验写入巡检提醒。", sourceFields({ triggerSource: "S06/S11", sourceType: "static_prior", relatedChannels: ["S06", "S11"], supportingRealChannels: [], responsiblePerson: "地测科工程师", status: "待执行", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.44, reliabilityWeight: 0.7 })),
    hazard("HZ-006", "回风管路 B 负压波动需复查密闭", "normal", "回风管路 B", "机电队", "机电队值班员", "整改", "2026-07-07", 0, "handling", "检查密闭、阀门与负压记录。", sourceFields({ triggerSource: "R13/R14", sourceType: "real_sensor", relatedChannels: ["R13", "R14"], supportingRealChannels: ["R13", "R14"], responsiblePerson: "机电队值班员", status: "管控中", needsHumanReview: false, majorHazardCandidate: "none", modelScore: 0.61, reliabilityWeight: 1 })),
    hazard("HZ-007", "采空区邻近带物理约束指标进入待复核", "critical", "采空区邻近带", "安全科", "安全副总工程师", "分析", "2026-07-05", 0, "verifying", "矿级会商确认前不得定性为重大隐患。", sourceFields({ triggerSource: "B21/B28/B34", sourceType: "physics_constrained", relatedChannels: ["B21", "B28", "B34"], supportingRealChannels: ["R03", "R04", "R10"], responsiblePerson: "安全副总工程师", status: "待复核", needsHumanReview: true, majorHazardCandidate: "pending", modelScore: 0.88, reliabilityWeight: 0.58 })),
    hazard("HZ-008", "南翼联络巷风险告知牌更新滞后", "low", "南翼联络巷", "安全科", "安全科资料员", "验收", "2026-07-09", 0, "reviewing", "更新告知牌与班组宣贯条目。", sourceFields({ triggerSource: "S18", sourceType: "static_prior", relatedChannels: ["S18"], supportingRealChannels: [], responsiblePerson: "安全科资料员", status: "验收中", needsHumanReview: true, majorHazardCandidate: "none", modelScore: 0.28, reliabilityWeight: 0.72 })),
  ],
  workflowSteps: [
    { name: "整理", owner: "安全科", time: "2026-07-05 08:30", status: "done", materialSummary: "汇总隐患来源、区域、风险等级与责任单位。", nextHint: "进入原因分析，确认关联通道与区域。" },
    { name: "分析", owner: "技术负责人", time: "2026-07-05 09:00", status: "done", materialSummary: "分析来源类型、支撑真实通道和人工复核要求。", nextHint: "准备通报对象与处置要求。" },
    { name: "通报", owner: "调度室", time: "2026-07-05 09:20", status: "done", materialSummary: "记录通报范围，不发送真实通知。", nextHint: "责任单位执行整改。" },
    { name: "整改", owner: "责任单位", time: "2026-07-05 10:00", status: "active", materialSummary: "整改措施与现场照片仅保留摘要占位。", nextHint: "提交反馈材料摘要。" },
    { name: "反馈", owner: "责任单位", time: "待填写", status: "pending", materialSummary: "待补充整改反馈与复核记录。", nextHint: "进入验收节点。" },
    { name: "验收", owner: "安全科", time: "待填写", status: "pending", materialSummary: "待验收人记录结论。", nextHint: "提交审查。" },
    { name: "审查", owner: "矿级管理", time: "待填写", status: "pending", materialSummary: "审查整改闭环完整性。", nextHint: "符合条件后销号。" },
    { name: "销号", owner: "安全科", time: "待填写", status: "pending", materialSummary: "完成闭环销号记录。", nextHint: "复盘请转到独立复盘页面。" },
  ],
  overdueItems: [
    { hazardId: "HZ-002", owner: "防突队技术员", overdueDays: 1, escalationLevel: "班组提醒", notifyStrategy: "页面占位，不发送真实通知", suggestion: "补充复核摘要后提交验收。" },
    { hazardId: "HZ-004", owner: "通风区班组长", overdueDays: 2, escalationLevel: "科室督办", notifyStrategy: "页面占位，不触发短信或企业微信", suggestion: "复查风门联锁并上传 mock 材料摘要。" },
    { hazardId: "HZ-007", owner: "安全副总工程师", overdueDays: 0, escalationLevel: "矿级关注", notifyStrategy: "仅展示待复核状态，不自动升级真实处置", suggestion: "完成矿级会商后再决定是否纳入重大隐患候选。" },
  ],
  reviews: [
    { id: "RV-001", title: "东翼回风巷瓦斯波动处置复盘", objectType: "预警事件", conclusion: "处置链路完整，但通道校验说明需要前置。", improvement: "在风险告知卡中补充通道校验检查项。", trackingStatus: "跟踪中" },
    { id: "RV-002", title: "钻孔压力记录缺项复盘", objectType: "隐患治理", conclusion: "材料摘要不足影响验收效率。", improvement: "统一反馈材料模板。", trackingStatus: "待确认" },
    { id: "RV-003", title: "物理约束辅助预警复核复盘", objectType: "专项复核", conclusion: "B 类指标能提示关注，但不能替代现场确认。", improvement: "页面持续显示人工复核和候选状态。", trackingStatus: "已纳入" },
    { id: "RV-004", title: "风险告知牌更新复盘", objectType: "文化宣贯", conclusion: "静态风险先验需要同步到班组宣贯材料。", improvement: "每月比对风险清单与展板条目。", trackingStatus: "跟踪中" },
  ],
  config: {
    riskLevelRules: [
      { label: "低风险", value: "日常巡检和区域观察" },
      { label: "一般风险", value: "责任单位纳入计划检查" },
      { label: "较大风险", value: "责任单位当班复核并形成记录" },
      { label: "重大风险候选", value: "只允许人工会商确认，B 类指标仅可 pending" },
    ],
    closureDeadlineRules: [
      { label: "较大及以上", value: "原则上 24 小时内反馈整改摘要" },
      { label: "一般风险", value: "3 日内完成反馈或说明" },
      { label: "低风险", value: "7 日内纳入巡检闭环" },
    ],
    overdueEscalationRules: [
      { label: "1 天", value: "班组提醒，仅页面显示" },
      { label: "2-3 天", value: "科室督办，不发送真实通知" },
      { label: "超过 3 天", value: "矿级关注，仍需人工确认" },
    ],
    inspectionFrequencyRules: [
      { label: "real_sensor", value: "按真实传感器异常程度每班或实时关注" },
      { label: "physics_constrained", value: "触发后专项复核，不直接处置" },
      { label: "static_prior", value: "周检或月检纳入计划" },
      { label: "manual_check", value: "按岗位巡检周期执行" },
    ],
    responsibilityOrganizations: [
      { label: "安全科", value: "闭环监督、验收、审查和销号" },
      { label: "通风区", value: "通风与瓦斯类风险整改" },
      { label: "防突队", value: "钻孔压力与防突复核" },
      { label: "监测中心", value: "传感器、辅助指标和模型边界说明" },
    ],
    notificationBoundary: [
      { label: "真实通知", value: "本阶段不发送短信、电话、企业微信或邮件" },
      { label: "页面提醒", value: "仅作为 mock 展示和 API 契约字段" },
    ],
    modelIntegrationBoundary: [
      { label: "模型 API", value: "当前不接真实模型 API" },
      { label: "数据库", value: "当前不接真实数据库" },
      { label: "处置动作", value: "不触发断电、撤人或真实台账写入" },
    ],
    realSensorTriggerBoundary: [
      { label: "触发来源", value: "真实传感器仅展示关联通道、区域、责任人和闭环节点" },
      { label: "处置边界", value: "页面不触发断电、撤人、派单或真实台账写入" },
    ],
    physicsConstrainedMetricBoundary: [
      { label: "B 类指标", value: "物理约束生成指标只作辅助复核来源，不写成真实传感器" },
      { label: "重大隐患候选", value: "只能显示 pending，必须经过人工会商确认" },
    ],
    mockApiCoverage: [
      { label: "列表接口", value: "overview、risk-controls、risk-map、risk-cards、hazards、workflow、reviews" },
      { label: "详情接口", value: "risk-cards/{id} 支持 RC001/RC-001/CARD-001，hazard-ledger/{id} 支持 H001/HZ-001" },
      { label: "只读边界", value: "当前仅支持 GET mock API，不实现保存、通知、上传或真实配置写入" },
    ],
  },
  cultureBoard: {
    philosophy: [
      { label: "双重预防", value: "风险分级管控 + 隐患排查治理" },
      { label: "核心原则", value: "先识别风险，再闭环治理，不用模型结果替代现场确认" },
    ],
    colorRiskGuide: [
      { label: "蓝", value: "低风险，日常巡检" },
      { label: "黄", value: "一般风险，计划管控" },
      { label: "橙", value: "较大风险，当班复核" },
      { label: "红", value: "重大风险候选需人工确认" },
    ],
    workflowGuide: [
      { label: "八步闭环", value: "整理、分析、通报、整改、反馈、验收、审查、销号" },
      { label: "复盘边界", value: "复盘独立展示，不作为第九步" },
    ],
    realSensorTriggerGuide: [
      { label: "真实传感器", value: "R01-R22 可作为真实传感器来源，可靠性权重为 1.0" },
      { label: "展示方式", value: "显示触发通道、区域、责任人和处置步骤" },
    ],
    physicsConstrainedBoundary: [
      { label: "B01-B41", value: "物理约束生成指标，只能作为辅助预警或专项复核触发" },
      { label: "重大隐患", value: "候选状态只能 pending，必须人工复核" },
    ],
    knowledgeCultureBoardBoundary: [
      { label: "双控展板", value: "聚焦风险分级管控、隐患治理、班组宣贯和闭环案例" },
      { label: "知识库展板", value: "/knowledge/culture-board 保留标准规范、培训材料和案例知识入口" },
    ],
    excellentCases: [
      { label: "案例 1", value: "东翼回风巷复核闭环，材料完整度提升" },
      { label: "案例 2", value: "风门闭锁记录补齐，验收节点缩短" },
    ],
    teamPromotionItems: [
      { label: "班前会", value: "讲清四色风险和八步闭环" },
      { label: "现场牌板", value: "提示 B 类辅助指标不得直接定性" },
      { label: "岗位卡片", value: "责任人、期限、措施三要素同步" },
    ],
    assessmentMetrics: [
      { label: "闭环及时率", value: "按 mock 台账计算，后续接真实台账" },
      { label: "复核完成率", value: "B 类触发必须留痕人工复核" },
      { label: "材料完整度", value: "整改措施、责任人、期限、当前步骤齐全" },
    ],
  },
}) as DoublePreventionSnapshot;
