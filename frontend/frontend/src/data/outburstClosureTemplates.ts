export type OutburstClosureTemplateType =
  | "real_sensor_event"
  | "physics_constrained_event"
  | "static_or_manual_event"
  | "backend_reported_event";

export type OutburstClosureTemplate = {
  id: string;
  type: OutburstClosureTemplateType;
  title: string;
  triggerSource: string;
  relatedChannels: string;
  verification: string[];
  disposalActions: string[];
  escalationConditions: string[];
  owner: string;
  closureStatus: string;
  boundaryNotice: string;
};

export const outburstClosureTemplates: Record<OutburstClosureTemplateType, OutburstClosureTemplate> = {
  real_sensor_event: {
    id: "D-01",
    type: "real_sensor_event",
    title: "真实传感器触发闭环模板",
    triggerSource: "R01-R22 真实传感器指标位，source_type=real_sensor",
    relatedChannels: "关联触发 R 通道、同类备用测点、空间相邻测点和通风/抽采联动测点",
    verification: ["复核传感器当前值、历史曲线和单位换算", "核查安装位置、标校状态和馈电/报警联动", "现场瓦检、测风、抽采参数和通风设施复核"],
    disposalActions: ["按后端规则和矿井制度进入报警、复核、处置台账", "检查通风、抽采、封孔、喷雾除尘和现场作业状态", "形成处置记录、复核结论和关闭依据"],
    escalationConditions: ["真实传感器持续异常且处置后未恢复", "甲烷、风速、风向、CO/O2/CO2 等出现危险组合", "现场负责人或调度按应急预案要求升级"],
    owner: "调度室 / 通风队 / 现场责任班组",
    closureStatus: "可进入正式复核和处置闭环",
    boundaryNotice: "是否断电、撤人或确认重大隐患，仍以后端规则、适用法规和人工确认决定。",
  },
  physics_constrained_event: {
    id: "D-02",
    type: "physics_constrained_event",
    title: "物理约束生成/估计指标触发闭环模板",
    triggerSource: "B01-B41 物理约束生成/估计前兆指标，source_type=physics_constrained",
    relatedChannels: "支撑真实通道 R01-R22、相关曲线、物理约束满足率和人工复核记录",
    verification: ["回查支撑真实传感器曲线是否同步异常", "复核生成/估计指标的可靠性权重和物理约束满足情况", "安排钻屑量、瓦斯压力、微震、声发射或顶板监测专项复核"],
    disposalActions: ["仅进入待复核/辅助预警", "记录支撑真实通道和专项复核结果", "复核确认后再决定是否转入正式隐患闭环"],
    escalationConditions: ["同区域真实传感器同步异常", "专项复核发现喷孔、顶钻、瓦斯压力或围岩异常", "人工确认存在现场风险"],
    owner: "模型值班员 / 通风技术员 / 现场复核人员",
    closureStatus: "不能直接写成已确认重大隐患",
    boundaryNotice: "B 指标不是现场真实采集值，不能单独触发断电、撤人或重大隐患确认。",
  },
  static_or_manual_event: {
    id: "D-03",
    type: "static_or_manual_event",
    title: "静态风险/人工巡检触发闭环模板",
    triggerSource: "S01-S32 静态风险项、资料复核或人工巡检触发",
    relatedChannels: "静态风险项 S01-S32，必要时关联 R01-R22 作为现场复核依据",
    verification: ["复核地质、通风、抽采、瓦斯参数和制度执行资料", "开展现场巡检和班组确认", "核查整改责任、期限、验收材料和复盘记录"],
    disposalActions: ["形成隐患整改任务和责任闭环", "作为管控优先级、场景修正和巡检重点", "整改完成后人工复核并关闭"],
    escalationConditions: ["资料异常与真实传感器异常同现", "巡检确认存在现场隐患", "整改逾期或反复出现同类问题"],
    owner: "安全管理部门 / 专业科室 / 区队负责人",
    closureStatus: "作为风险先验和整改闭环，不占动态通道槽位",
    boundaryNotice: "静态风险不能替代动态监测，也不能直接证明实时异常。",
  },
  backend_reported_event: {
    id: "D-00",
    type: "backend_reported_event",
    title: "来源待确认闭环模板",
    triggerSource: "后端返回但缺少 source_type、slot 或可识别 sensor_id",
    relatedChannels: "待补齐",
    verification: ["补齐 source_type、slot、sensor_id 或后端字段映射", "人工确认数据来源后选择 D-01、D-02 或 D-03 模板"],
    disposalActions: ["仅作为待确认线索展示", "不自动进入正式处置结论"],
    escalationConditions: ["补齐来源并经人工确认后再判断"],
    owner: "模型值班员 / 数据管理员",
    closureStatus: "来源待确认",
    boundaryNotice: "来源未确认前不能作为断电、撤人、重大隐患或正式整改依据。",
  },
};

export function getOutburstClosureTemplate(type: OutburstClosureTemplateType) {
  return outburstClosureTemplates[type] ?? outburstClosureTemplates.backend_reported_event;
}
