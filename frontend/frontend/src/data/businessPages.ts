import { mockAgent } from "./mockAgent";
import { boundaryNotes, generatedChannelNames, mockUpdatedAt, realChannelNames, riskLevelText, statusText, versionStatusText } from "./mockConstants";
import { mockDashboard } from "./mockDashboard";
import { mockDataModel } from "./mockDataModel";
import { mockDoublePrevention } from "./mockDoublePrevention";
import { mockKnowledge } from "./mockKnowledge";
import { mockMonitoring } from "./mockMonitoring";
import { mockRegionDetail, mockRegions } from "./mockRegions";
import { mockSourceTracing } from "./mockSourceTracing";
import { mockSystem } from "./mockSystem";
import { mockTwin } from "./mockTwin";
import { mockWarnings } from "./mockWarnings";
import type { BusinessPageContent, BusinessSection, KeyValueItem, RecordValue, TableColumn } from "@/types/business";
import type { MetricCardModel } from "@/types/navigation";

const commonStatusNotes = ["页面内容来自 TypeScript 类型、Zod schema 与 mock 数据三者共同约束。", "当前只表达业务信息结构，不执行真实操作。"];
const chartPlaceholder = "mock 图表容器：用于展示当前页面的数据结构和趋势视图。";

function metric(label: string, value: string, hint: string, risk?: MetricCardModel["risk"], trend?: string): MetricCardModel {
  return { label, value, hint, risk, trend };
}

function table(title: string, columns: TableColumn[], rows: Record<string, RecordValue>[], description?: string): BusinessSection {
  return { kind: "table", title, description, columns, rows };
}

function detail(title: string, items: KeyValueItem[], description?: string): BusinessSection {
  return { kind: "detail", title, description, items };
}

function list(title: string, items: string[], description?: string): BusinessSection {
  return { kind: "list", title, description, items };
}

function chart(title: string, metrics?: KeyValueItem[], description = chartPlaceholder): BusinessSection {
  return { kind: "chart", title, description, status: "仅保留 mock 图表容器，不做真实图表联动。", metrics };
}

function page(path: string, metrics: MetricCardModel[], sections: BusinessSection[], extraBoundary: string[] = []): BusinessPageContent {
  return {
    path,
    metrics,
    sections,
    statusNotes: commonStatusNotes,
    boundaryNotes: [...boundaryNotes, ...extraBoundary],
    dataSource: "mock",
    updatedAt: mockUpdatedAt,
  };
}

const warningRows = mockWarnings.events.map((event) => ({
  id: event.id,
  risk: riskLevelText[event.riskLevel],
  time: event.eventTime,
  region: event.regionName,
  channels: event.relatedChannels.join(", "),
  status: statusText[event.status],
  owner: event.owner,
}));

const channelRows = mockMonitoring.realChannels.map((channel) => ({
  id: channel.id,
  name: channel.name,
  source: "真实传感器",
  region: channel.regionName,
  health: channel.health,
  latest: channel.latestValue ?? null,
  sampleAt: channel.latestSampleAt,
  maintainer: channel.maintainer,
}));

const regionRows = mockRegions.map((region) => ({
  id: region.regionId,
  region: region.regionName,
  risk: riskLevelText[region.riskLevel],
  hazards: region.hazardCount,
  warnings: region.warningCount,
  updatedAt: region.updatedAt,
  status: region.controlStatus,
}));

const hazardRows = mockDoublePrevention.hazards.map((hazard) => ({
  id: hazard.id,
  description: hazard.description,
  risk: riskLevelText[hazard.riskLevel],
  region: hazard.regionName,
  owner: hazard.owner,
  step: hazard.currentStep,
  deadline: hazard.deadline,
  overdue: hazard.overdueDays,
}));

const featureRows = mockDataModel.featureDictionary.map((feature) => ({
  id: feature.id,
  name: feature.name,
  type: feature.type === "real_channel" ? "真实通道" : "生成前兆通道",
  source: feature.sourceChannel,
  unit: feature.unit,
  usage: feature.modelUsage,
  boundary: feature.boundary,
}));

export const businessPageByPath: Record<string, BusinessPageContent> = {
  "/dashboard": page("/dashboard", mockDashboard.metrics, [
    table("重点区域风险排行", [
      { key: "id", label: "区域编号" },
      { key: "region", label: "区域" },
      { key: "risk", label: "风险等级" },
      { key: "hazards", label: "隐患数" },
      { key: "warnings", label: "预警数" },
      { key: "status", label: "管控状态" },
    ], regionRows),
    detail("近期趋势占位", mockDashboard.trendPlaceholders),
    table("待办处置任务", [
      { key: "id", label: "任务编号" },
      { key: "title", label: "任务" },
      { key: "owner", label: "责任人" },
      { key: "dueAt", label: "截止时间" },
      { key: "status", label: "状态" },
    ], mockDashboard.todoTasks.map((task) => ({ ...task, status: statusText[task.status] }))),
    chart("近期预警趋势"),
  ]),

  "/monitoring": page("/monitoring", [
    metric("真实传感器通道", "14", "仅展示真实传感器通道", "low"),
    metric("在线通道", "12", "在线真实通道数量", "low"),
    metric("异常/维护通道", "2", "校验中或维护中", "normal"),
    metric("最新采样", mockMonitoring.updatedAt, "演示采样时间"),
  ], [
    detail("通道健康摘要", mockMonitoring.channelHealth),
    { kind: "timeline", title: "异常波动提示", description: "mock 异常片段，不触发真实告警。", items: mockMonitoring.abnormalFluctuations },
    table("真实传感器通道摘要", [
      { key: "id", label: "通道" },
      { key: "name", label: "名称" },
      { key: "region", label: "区域" },
      { key: "health", label: "健康" },
      { key: "sampleAt", label: "采样时间" },
    ], channelRows),
    list("监测总览边界", ["真实监测通道以后端元数据和最新传感器接口为准。", "生成前兆通道不作为实时监测通道展示。"]),
  ], ["禁止把生成通道混写为真实监测通道。"]),

  "/monitoring/realtime": page("/monitoring/realtime", [
    metric("真实传感器通道", "动态", "以后端 sensors/latest 为准", "low"),
    metric("健康通道", "动态", "mock 健康统计", "normal"),
    metric("异常波动", "2", "待人工复核片段", "high"),
    metric("最新采样", mockMonitoring.updatedAt, "演示采样时间"),
  ], [
    table("真实传感器通道", [
      { key: "id", label: "通道" },
      { key: "name", label: "名称" },
      { key: "region", label: "区域" },
      { key: "health", label: "健康" },
      { key: "latest", label: "最新值" },
      { key: "sampleAt", label: "采样时间" },
    ], channelRows),
    { kind: "timeline", title: "异常波动提示", description: "mock 异常片段，不触发真实告警。", items: mockMonitoring.abnormalFluctuations },
    chart("实时曲线占位", mockMonitoring.realtimePlaceholders),
  ], ["禁止连接真实 WebSocket、MQTT、SSE 或生产监测接口。"]),

  "/monitoring/channels": page("/monitoring/channels", [
    metric("通道列表", "14", "真实传感器通道字典"),
    metric("待校验", "1", "mock 校验状态", "normal"),
    metric("维护责任组", "2", "静态责任分组"),
  ], [
    table("通道配置与健康巡检", [
      { key: "id", label: "通道" },
      { key: "name", label: "通道名称" },
      { key: "source", label: "来源" },
      { key: "region", label: "所属区域" },
      { key: "health", label: "在线状态" },
      { key: "sampleAt", label: "最近更新" },
      { key: "maintainer", label: "维护责任人" },
    ], channelRows),
    detail("通道健康摘要", mockMonitoring.channelHealth),
    list("配置边界", ["不提供真实启停、删除或校准操作。", "不写入真实设备配置。"]),
  ]),

  "/warning/events": page("/warning/events", [
    metric("预警事件", String(mockWarnings.events.length), "mock 事件表格"),
    metric("重大风险", "1", "统一风险四色", "critical"),
    metric("待处置", "3", "演示处置状态", "normal"),
  ], [
    detail("筛选与检索占位", mockWarnings.filters),
    table("预警事件列表", [
      { key: "id", label: "事件编号" },
      { key: "risk", label: "风险等级" },
      { key: "time", label: "事件时间" },
      { key: "region", label: "区域" },
      { key: "channels", label: "关联通道" },
      { key: "status", label: "处置状态" },
      { key: "owner", label: "责任人" },
    ], warningRows),
    chart("事件趋势占位"),
  ], ["不修改真实事件状态，不发送短信、电话、企业微信或邮件通知。"]),

  "/warning/events/[id]": page("/warning/events/[id]", [
    metric("事件编号", mockWarnings.detail.id, "动态路由详情 mock"),
    metric("风险等级", riskLevelText[mockWarnings.detail.riskLevel], "统一枚举", mockWarnings.detail.riskLevel),
    metric("关联通道", String(mockWarnings.detail.relatedChannels.length), "曲线容器占位"),
  ], [
    detail("事件基础信息", [
      { label: "区域", value: mockWarnings.detail.regionName },
      { label: "事件时间", value: mockWarnings.detail.eventTime },
      { label: "责任人", value: mockWarnings.detail.owner },
      { label: "处置状态", value: statusText[mockWarnings.detail.status] },
      { label: "溯源入口", value: mockWarnings.detail.tracingEntry },
    ]),
    { kind: "timeline", title: "处置进度", items: mockWarnings.detail.disposalRecords },
    list("处置建议", mockWarnings.detail.advice),
    chart("关联通道曲线占位"),
  ]),

  "/source-tracing": page("/source-tracing", [
    metric("注意力指标", String(mockSourceTracing.attentionWeights.length), "mock 权重排行"),
    metric("疑似危险源", "1", "辅助解释", "normal"),
    metric("解释窗口", "30 min", "静态时间窗"),
  ], [
    table("注意力权重与贡献指标", [
      { key: "feature", label: "指标" },
      { key: "channel", label: "通道" },
      { key: "weight", label: "权重" },
      { key: "contribution", label: "贡献说明" },
    ], mockSourceTracing.attentionWeights.map((item) => ({ feature: item.feature, channel: item.channelId, weight: item.weight, contribution: item.contribution }))),
    { kind: "timeline", title: "致因链路", items: mockSourceTracing.causalChain },
    detail("溯源详情", mockSourceTracing.detail),
  ], ["不调用真实模型推理，不将溯源结果写成最终事故原因。"]),

  "/source-tracing/attention": page("/source-tracing/attention", [
    metric("权重窗口", "30 min", "mock 时间窗口"),
    metric("贡献指标", String(mockSourceTracing.attentionWeights.length), "静态指标字典"),
    metric("关联传感器", "4", "演示关联关系"),
  ], [
    table("指标贡献排行", [
      { key: "feature", label: "指标" },
      { key: "channel", label: "关联通道" },
      { key: "weight", label: "权重" },
      { key: "contribution", label: "解释" },
    ], mockSourceTracing.attentionWeights.map((item) => ({ feature: item.feature, channel: item.channelId, weight: item.weight, contribution: item.contribution }))),
    chart("贡献变化趋势"),
    detail("解释边界", mockSourceTracing.contributionMetrics),
  ]),

  "/source-tracing/events/[id]": page("/source-tracing/events/[id]", [
    metric("事件编号", mockWarnings.detail.id, "动态详情示例"),
    metric("溯源性质", "辅助解释", "人工复核后使用", "normal"),
    metric("贡献指标", String(mockSourceTracing.attentionWeights.length), "注意力权重摘要"),
  ], [
    detail("事件溯源摘要", [
      { label: "事件", value: mockWarnings.detail.summary },
      { label: "区域", value: mockWarnings.detail.regionName },
      { label: "关联通道", value: mockWarnings.detail.relatedChannels.join(", ") },
      { label: "回到预警详情", value: mockWarnings.detail.tracingEntry },
    ]),
    table("注意力权重", [
      { key: "feature", label: "指标" },
      { key: "channel", label: "通道" },
      { key: "weight", label: "权重" },
      { key: "contribution", label: "贡献说明" },
    ], mockSourceTracing.attentionWeights.map((item) => ({ feature: item.feature, channel: item.channelId, weight: item.weight, contribution: item.contribution }))),
    { kind: "timeline", title: "致因链路", items: mockSourceTracing.causalChain },
  ], ["溯源结果仅作辅助解释，不写入真实事件台账，不作为最终事故原因。"]),

  "/regions": page("/regions", [
    metric("区域数量", String(mockRegions.length), "mock 区域列表"),
    metric("重点区域", "2", "较大及以上风险", "high"),
    metric("闭环中隐患", "8", "演示治理数据"),
  ], [
    table("区域风险列表", [
      { key: "id", label: "区域编号" },
      { key: "region", label: "区域名称" },
      { key: "risk", label: "风险等级" },
      { key: "hazards", label: "隐患数" },
      { key: "warnings", label: "预警数" },
      { key: "updatedAt", label: "最近更新" },
      { key: "status", label: "管控状态" },
    ], regionRows),
    chart("区域风险排行占位"),
  ]),

  "/regions/[regionId]": page("/regions/[regionId]", [
    metric("当前风险", riskLevelText[mockRegionDetail.riskLevel], "mock 区域等级", mockRegionDetail.riskLevel),
    metric("关联传感器", String(mockRegionDetail.relatedSensors.length), "静态点位"),
    metric("关联隐患", String(mockRegionDetail.relatedHazards.length), "mock 隐患列表"),
  ], [
    detail("区域基础信息", [
      { label: "区域", value: mockRegionDetail.regionName },
      { label: "管控状态", value: mockRegionDetail.controlStatus },
      { label: "最近更新", value: mockRegionDetail.updatedAt },
    ]),
    list("关联传感器", mockRegionDetail.relatedSensors),
    list("管控措施", mockRegionDetail.controlMeasures),
    { kind: "timeline", title: "预警历史", items: mockRegionDetail.warningHistory },
  ], ["不展示未脱敏真实空间信息，不修改真实管控措施。"]),

  "/double-prevention": page("/double-prevention", [
    metric("风险管控项", String(mockDoublePrevention.riskControls.length), "mock 风险清单"),
    metric("隐患治理中", String(mockDoublePrevention.hazards.length), "八步闭环治理"),
    metric("逾期事项", String(mockDoublePrevention.overdueItems.length), "待升级占位", "high"),
    metric("复盘案例", String(mockDoublePrevention.reviews.length), "复盘独立页面"),
  ], [
    table("风险管控摘要", [
      { key: "id", label: "编号" },
      { key: "name", label: "风险" },
      { key: "risk", label: "等级" },
      { key: "region", label: "区域" },
      { key: "owner", label: "责任单位" },
    ], mockDoublePrevention.riskControls.map((item) => ({ id: item.id, name: item.name, risk: riskLevelText[item.riskLevel], region: item.regionName, owner: item.ownerUnit }))),
    table("重点隐患待办", [
      { key: "id", label: "隐患编号" },
      { key: "description", label: "描述" },
      { key: "step", label: "当前步骤" },
      { key: "deadline", label: "期限" },
      { key: "overdue", label: "逾期天数" },
    ], hazardRows),
    chart("区域风险矩阵占位"),
  ], ["复盘独立在 /double-prevention/review，不并入八步闭环。"]),

  "/double-prevention/risk-control": page("/double-prevention/risk-control", [
    metric("风险项", String(mockDoublePrevention.riskControls.length), "mock 风险清单"),
    metric("较大及以上", "2", "四色等级统一", "high"),
    metric("责任单位", "3", "静态组织占位"),
  ], [
    table("风险辨识清单", [
      { key: "id", label: "编号" },
      { key: "name", label: "风险名称" },
      { key: "risk", label: "等级" },
      { key: "region", label: "区域" },
      { key: "owner", label: "责任单位" },
      { key: "frequency", label: "检查频次" },
    ], mockDoublePrevention.riskControls.map((item) => ({ id: item.id, name: item.name, risk: riskLevelText[item.riskLevel], region: item.regionName, owner: item.ownerUnit, frequency: item.inspectionFrequency }))),
    list("风险四色规则", ["蓝色：低风险", "黄色：一般风险", "橙色：较大风险", "红色：重大风险"]),
  ]),

  "/double-prevention/risk-map": page("/double-prevention/risk-map", [
    metric("风险网格", String(mockDoublePrevention.riskMap.length), "mock 区域网格"),
    metric("重大风险点", "1", "红色标识", "critical"),
    metric("图例", "四色", "静态规则"),
  ], [
    table("风险四色图网格", [
      { key: "id", label: "网格" },
      { key: "region", label: "区域" },
      { key: "risk", label: "风险等级" },
      { key: "point", label: "风险点" },
    ], mockDoublePrevention.riskMap.map((item) => ({ id: item.id, region: item.regionName, risk: riskLevelText[item.riskLevel], point: item.riskPoint }))),
    chart("风险热区容器占位"),
  ], ["不使用真实矿区精确坐标。"]),

  "/double-prevention/risk-cards": page("/double-prevention/risk-cards", [
    metric("告知卡", String(mockDoublePrevention.riskCards.length), "mock 卡片列表"),
    metric("待复核", "1", "演示状态"),
    metric("责任单位", "2", "静态单位字典"),
  ], [
    table("风险告知卡列表", [
      { key: "id", label: "卡片编号" },
      { key: "name", label: "风险名称" },
      { key: "risk", label: "等级" },
      { key: "region", label: "区域" },
      { key: "owner", label: "责任单位" },
      { key: "measure", label: "措施摘要" },
    ], mockDoublePrevention.riskCards.map((item) => ({ id: item.id, name: item.name, risk: riskLevelText[item.riskLevel], region: item.regionName, owner: item.ownerUnit, measure: item.measureSummary }))),
  ], ["不生成正式盖章告知卡。"]),

  "/double-prevention/risk-cards/[id]": page("/double-prevention/risk-cards/[id]", [
    metric("风险等级", riskLevelText[mockDoublePrevention.riskCards[0].riskLevel], "mock 详情", mockDoublePrevention.riskCards[0].riskLevel),
    metric("管控措施", "1", "措施摘要"),
    metric("关联隐患", String(mockDoublePrevention.riskCards[0].relatedHazards.length), "mock 关联记录"),
  ], [
    detail("风险告知卡详情", [
      { label: "风险名称", value: mockDoublePrevention.riskCards[0].name },
      { label: "风险描述", value: "基于 mock 风险项生成的详情说明。" },
      { label: "管控措施", value: mockDoublePrevention.riskCards[0].measureSummary },
      { label: "应急处置", value: mockDoublePrevention.riskCards[0].emergencyAction },
      { label: "责任人", value: mockDoublePrevention.riskCards[0].responsiblePerson },
      { label: "检查频次", value: mockDoublePrevention.riskCards[0].inspectionFrequency },
    ]),
    list("关联隐患", mockDoublePrevention.riskCards[0].relatedHazards),
  ]),

  "/double-prevention/measure-library": page("/double-prevention/measure-library", [
    metric("措施条目", String(mockDoublePrevention.measures.length), "mock 措施库"),
    metric("措施分类", "3", "静态分类"),
    metric("引用关系", "占位", "不发布正式制度"),
  ], [
    table("管控措施库", [
      { key: "id", label: "编号" },
      { key: "category", label: "分类" },
      { key: "risk", label: "适用风险" },
      { key: "frequency", label: "执行频次" },
      { key: "role", label: "责任角色" },
      { key: "checklist", label: "检查要点" },
    ], mockDoublePrevention.measures.map((item) => ({ id: item.id, category: item.category, risk: item.applicableRisk, frequency: item.executionFrequency, role: item.role, checklist: item.checklist }))),
  ], ["不发布正式制度条款，不写入真实措施库。"]),

  "/double-prevention/hazard-governance": page("/double-prevention/hazard-governance", [
    metric("隐患总数", String(mockDoublePrevention.hazards.length), "mock 台账"),
    metric("治理中", "2", "闭环状态"),
    metric("逾期", String(mockDoublePrevention.overdueItems.length), "升级占位", "high"),
  ], [
    table("重点隐患摘要", [
      { key: "id", label: "编号" },
      { key: "description", label: "隐患描述" },
      { key: "risk", label: "等级" },
      { key: "step", label: "当前步骤" },
      { key: "owner", label: "责任人" },
    ], hazardRows),
    chart("治理趋势占位"),
  ]),

  "/double-prevention/hazard-ledger": page("/double-prevention/hazard-ledger", [
    metric("隐患台账", String(mockDoublePrevention.hazards.length), "mock 隐患记录"),
    metric("当前步骤", "八步闭环", "固定顺序"),
    metric("逾期记录", "2", "演示升级", "high"),
  ], [
    table("隐患台账列表", [
      { key: "id", label: "编号" },
      { key: "description", label: "隐患描述" },
      { key: "risk", label: "风险等级" },
      { key: "region", label: "区域" },
      { key: "owner", label: "责任人" },
      { key: "step", label: "当前步骤" },
      { key: "deadline", label: "期限" },
      { key: "overdue", label: "逾期天数" },
    ], hazardRows),
  ], ["不写入真实隐患台账，不删除或关闭真实隐患记录。"]),

  "/double-prevention/hazard-ledger/[id]": page("/double-prevention/hazard-ledger/[id]", [
    metric("隐患编号", mockDoublePrevention.hazards[0].id, "动态路由详情 mock"),
    metric("当前步骤", mockDoublePrevention.hazards[0].currentStep, "八步闭环"),
    metric("风险等级", riskLevelText[mockDoublePrevention.hazards[0].riskLevel], "统一枚举", mockDoublePrevention.hazards[0].riskLevel),
  ], [
    detail("隐患基础信息", [
      { label: "描述", value: mockDoublePrevention.hazards[0].description },
      { label: "区域", value: mockDoublePrevention.hazards[0].regionName },
      { label: "责任人", value: mockDoublePrevention.hazards[0].owner },
      { label: "期限", value: mockDoublePrevention.hazards[0].deadline },
    ]),
    { kind: "workflow", title: "八步闭环进度", steps: mockDoublePrevention.workflowSteps },
    chart("关联预警曲线占位"),
  ], ["复盘不写入八步进度。"]),

  "/double-prevention/hazard-workflow": page("/double-prevention/hazard-workflow", [
    metric("固定步骤", "8", "整理-分析-通报-整改-反馈-验收-审查-销号"),
    metric("当前节点", "整改", "mock 流程"),
    metric("材料摘要", "8 份", "每步均有字段占位"),
  ], [
    { kind: "workflow", title: "固定八步闭环", description: "严格展示：整理 -> 分析 -> 通报 -> 整改 -> 反馈 -> 验收 -> 审查 -> 销号。", steps: mockDoublePrevention.workflowSteps },
  ], ["禁止改变八步顺序，禁止把复盘作为第九步。"]),

  "/double-prevention/overdue-escalation": page("/double-prevention/overdue-escalation", [
    metric("逾期隐患", String(mockDoublePrevention.overdueItems.length), "mock 逾期列表", "high"),
    metric("升级级别", "2", "班组提醒/科室督办"),
    metric("真实通知", "未接入", "仅页面占位"),
  ], [
    table("逾期升级列表", [
      { key: "hazardId", label: "隐患" },
      { key: "owner", label: "责任人" },
      { key: "overdueDays", label: "逾期天数" },
      { key: "escalationLevel", label: "升级级别" },
      { key: "notifyStrategy", label: "通知策略" },
      { key: "suggestion", label: "处理建议" },
    ], mockDoublePrevention.overdueItems),
  ], ["不发送真实升级通知。"]),

  "/double-prevention/review": page("/double-prevention/review", [
    metric("复盘案例", String(mockDoublePrevention.reviews.length), "独立于八步闭环"),
    metric("跟踪中", "1", "mock 跟踪状态"),
    metric("改进建议", "2", "演示建议"),
  ], [
    table("复盘案例", [
      { key: "id", label: "编号" },
      { key: "title", label: "复盘主题" },
      { key: "objectType", label: "对象" },
      { key: "conclusion", label: "结论" },
      { key: "improvement", label: "改进建议" },
      { key: "trackingStatus", label: "跟踪状态" },
    ], mockDoublePrevention.reviews),
  ], ["不生成正式事故调查结论。"]),

  "/double-prevention/config": page("/double-prevention/config", [
    metric("风险等级规则", String(mockDoublePrevention.config.riskLevelRules.length), "四色风险口径"),
    metric("闭环期限规则", String(mockDoublePrevention.config.closureDeadlineRules.length), "按风险等级约束"),
    metric("模型边界", "只读", "不接真实模型 API", "normal", "未接入"),
  ], [
    detail("风险等级规则", mockDoublePrevention.config.riskLevelRules, "仅展示双控分级口径，不保存真实配置。"),
    detail("闭环期限规则", mockDoublePrevention.config.closureDeadlineRules),
    detail("逾期升级规则", mockDoublePrevention.config.overdueEscalationRules, "本阶段只显示页面提醒，不发送真实通知。"),
    detail("检查频次规则", mockDoublePrevention.config.inspectionFrequencyRules),
    detail("责任组织", mockDoublePrevention.config.responsibilityOrganizations),
    detail("通知边界", mockDoublePrevention.config.notificationBoundary),
    detail("模型接入边界", mockDoublePrevention.config.modelIntegrationBoundary),
  ], ["不开放真实系统配置写入，不连接真实数据库、真实模型 API 或真实通知渠道。"]),

  "/double-prevention/culture-board": page("/double-prevention/culture-board", [
    metric("双控理念", String(mockDoublePrevention.cultureBoard.philosophy.length), "风险分级 + 隐患治理"),
    metric("四色说明", String(mockDoublePrevention.cultureBoard.colorRiskGuide.length), "蓝黄橙红"),
    metric("考核指标", String(mockDoublePrevention.cultureBoard.assessmentMetrics.length), "mock 指标"),
  ], [
    detail("双控理念", mockDoublePrevention.cultureBoard.philosophy),
    detail("风险四色说明", mockDoublePrevention.cultureBoard.colorRiskGuide),
    detail("隐患八步闭环说明", mockDoublePrevention.cultureBoard.workflowGuide),
    detail("真实传感器触发说明", mockDoublePrevention.cultureBoard.realSensorTriggerGuide),
    detail("物理约束生成指标边界说明", mockDoublePrevention.cultureBoard.physicsConstrainedBoundary),
    detail("优秀整改案例", mockDoublePrevention.cultureBoard.excellentCases),
    detail("班组宣传条目", mockDoublePrevention.cultureBoard.teamPromotionItems),
    detail("考核指标", mockDoublePrevention.cultureBoard.assessmentMetrics),
  ], ["文化展板只展示宣贯材料，不发布正式制度，不把物理约束指标写成最终处置依据。"]),

  "/twin": page("/twin", [
    metric("巷道示意", "1", "静态示意"),
    metric("风险热力", String(mockTwin.heatmapCells.length), "mock 热区"),
    metric("传感器点位", String(mockTwin.sensorPoints.length), "点位展示"),
  ], [
    detail("空间态势摘要", mockTwin.tunnelSegments),
    table("风险点摘要", [
      { key: "id", label: "编号" },
      { key: "region", label: "区域" },
      { key: "risk", label: "等级" },
      { key: "point", label: "风险点" },
    ], mockTwin.heatmapCells.map((item) => ({ id: item.id, region: item.regionName, risk: riskLevelText[item.riskLevel], point: item.riskPoint }))),
    chart("数字孪生视图容器"),
  ], ["不加载真实矿井三维模型，不接真实定位或监测流。"]),

  "/twin/tunnel": page("/twin/tunnel", [
    metric("巷道段", "3", "静态示意"),
    metric("风险标注", String(mockTwin.heatmapCells.length), "mock 标注"),
    metric("视角控制", "轻量", "不做三维渲染"),
  ], [detail("巷道示意信息", mockTwin.tunnelSegments), chart("巷道示意视图")], ["不引入重型 3D 依赖或真实渲染任务。"]),

  "/twin/risk-heatmap": page("/twin/risk-heatmap", [
    metric("热力网格", String(mockTwin.heatmapCells.length), "mock 区域热力"),
    metric("高风险区域", "1", "橙色以上", "high"),
    metric("时间窗", "30 min", "静态筛选"),
  ], [
    table("热力区域列表", [
      { key: "id", label: "编号" },
      { key: "region", label: "区域" },
      { key: "risk", label: "等级" },
      { key: "point", label: "风险点" },
    ], mockTwin.heatmapCells.map((item) => ({ id: item.id, region: item.regionName, risk: riskLevelText[item.riskLevel], point: item.riskPoint }))),
    chart("风险热力图"),
  ], ["不把 mock 热力图当作真实预测结果。"]),

  "/twin/sensors": page("/twin/sensors", [
    metric("点位数量", String(mockTwin.sensorPoints.length), "mock 点位"),
    metric("健康状态", "在线为主", "静态状态"),
    metric("筛选", "可读", "区域/通道类型"),
  ], [
    table("传感器点位", [
      { key: "id", label: "点位" },
      { key: "name", label: "通道" },
      { key: "region", label: "区域" },
      { key: "health", label: "健康状态" },
      { key: "sampleAt", label: "最近上报" },
    ], mockTwin.sensorPoints.map((channel) => ({ id: channel.id, name: channel.name, region: channel.regionName, health: channel.health, sampleAt: channel.latestSampleAt }))),
  ], ["不展示真实敏感点位，不修改真实设备状态。"]),

  "/knowledge": page("/knowledge", [
    metric("标准规范", String(mockKnowledge.standards.length), "分类检索入口"),
    metric("AI 问答", String(mockAgent.recommendedQuestions.length), "推荐问题"),
    metric("致灾图谱", "22", "mock 关系边", "normal"),
    metric("引用证据", String(mockAgent.citations.length), "回答必须引用"),
  ], [
    table("标准规范摘要", [
      { key: "id", label: "条目" },
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "scenario", label: "适用场景" },
      { key: "summary", label: "摘要" },
    ], mockKnowledge.standards),
    detail("致灾图谱摘要", mockKnowledge.causalGraph),
    list("AI 推荐问题", mockAgent.recommendedQuestions),
  ], ["AI 回答不替代正式制度解释，必须显示引用证据与人工复核提示。"]),

  "/knowledge/search": page("/knowledge/search", [
    metric("规范条目", String(mockKnowledge.standards.length), "mock 标准库"),
    metric("分类筛选", "3", "通风/防突/双控"),
    metric("详情边界", "摘要", "不展示未经授权全文"),
  ], [
    table("标准规范检索结果", [
      { key: "id", label: "条目" },
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "scenario", label: "适用场景" },
      { key: "summary", label: "摘要" },
    ], mockKnowledge.standards),
    list("检索边界", ["只使用 mock 规范条目。", "不联网检索，不接真实文档库。", "不展示未经授权的全文制度材料。"]),
  ]),

  "/knowledge/causal-graph": page("/knowledge/causal-graph", [
    metric("风险因素节点", "6", "瓦斯、通风、地质等"),
    metric("关系边", "22", "mock 因果关系"),
    metric("人工复核", "必须", "非最终事故因果认定", "normal"),
  ], [
    detail("图谱摘要", mockKnowledge.causalGraph),
    table("关联标准与证据", [
      { key: "id", label: "证据" },
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "scenario", label: "适用场景" },
    ], mockAgent.citations.map((item) => ({ id: item.id, title: item.title, category: item.category, scenario: item.scenario }))),
    list("图谱边界", ["图谱关系用于辅助研判。", "不调用真实图数据库。", "不作为最终事故因果认定。"]),
  ]),

  "/knowledge/culture-board": page("/knowledge/culture-board", [
    metric("文化条目", String(mockKnowledge.cultureBoards.length), "弱化入口"),
    metric("培训材料", "mock", "宣传内容摘要"),
    metric("制度替代", "禁止", "不发布正式制度"),
  ], [
    detail("文化展板摘要", mockKnowledge.cultureBoards),
    list("展示边界", ["仅展示静态宣传内容。", "不与双重预防文化展板混同。", "不发布未经确认的正式宣传材料。"]),
  ]),

  "/data": page("/data", [
    metric("真实通道", String(mockDataModel.augmentation.realChannelCount), "以后端元数据为准", "low"),
    metric("生成前兆", String(mockDataModel.augmentation.generatedChannelCount), "历史遗留说明", "normal"),
    metric("指标结构", String(mockDataModel.augmentation.featureCount), "动态元数据节点"),
    metric("模型版本", mockDataModel.modelEvaluation.modelVersion, "mock 评估版本"),
  ], [
    detail("动态数据摘要", mockDataModel.dynamicData),
    detail("静态数据摘要", mockDataModel.staticData),
    table("数据集版本摘要", [
      { key: "version", label: "版本" },
      { key: "timeRange", label: "时间范围" },
      { key: "sampleCount", label: "样本数" },
      { key: "channelCoverage", label: "通道覆盖" },
      { key: "qualityScore", label: "质量评分" },
      { key: "relatedModel", label: "关联模型" },
    ], mockDataModel.datasetVersions),
    detail("数据增强边界", [
      { label: "真实通道", value: mockDataModel.augmentation.realChannelCount },
      { label: "生成前兆通道", value: mockDataModel.augmentation.generatedChannelCount },
      { label: "指标结构", value: mockDataModel.augmentation.featureCount },
      { label: "说明", value: mockDataModel.augmentation.boundary },
    ]),
  ], ["生成通道为辅助前兆指标，不替代真实传感器监测；不训练 WGAN-GP。"]),

  "/data/features": page("/data/features", [
    metric("指标节点", String(mockDataModel.augmentation.featureCount), "以后端元数据和动态指标字典为准"),
    metric("真实通道", String(mockDataModel.augmentation.realChannelCount), "传感器来源"),
    metric("生成指标", String(mockDataModel.augmentation.generatedChannelCount), "辅助前兆指标", "normal"),
  ], [
    table("后端指标字典", [
      { key: "id", label: "指标编号" },
      { key: "name", label: "指标名称" },
      { key: "type", label: "类型" },
      { key: "source", label: "来源通道" },
      { key: "unit", label: "单位" },
      { key: "usage", label: "适用模型" },
      { key: "boundary", label: "边界" },
    ], featureRows),
  ], ["不修改既有 feature_schema 含义，不把生成指标写成真实传感器原始值。"]),

  "/data/datasets": page("/data/datasets", [
    metric("数据集版本", String(mockDataModel.datasetVersions.length), "mock 版本列表"),
    metric("通道覆盖", "动态", "以后端元数据为准"),
    metric("质量评分", "91", "演示质量指标", "low"),
  ], [
    table("数据集版本", [
      { key: "version", label: "版本" },
      { key: "timeRange", label: "时间范围" },
      { key: "sampleCount", label: "样本数" },
      { key: "channelCoverage", label: "通道覆盖" },
      { key: "qualityScore", label: "质量评分" },
      { key: "relatedModel", label: "关联模型" },
      { key: "note", label: "备注" },
    ], mockDataModel.datasetVersions),
  ], ["不下载真实数据集，不上传大型训练数据。"]),

  "/data/augmentation": page("/data/augmentation", [
    metric("真实通道", String(mockDataModel.augmentation.realChannelCount), "以后端元数据为准", "low"),
    metric("生成通道", String(mockDataModel.augmentation.generatedChannelCount), "历史遗留说明", "normal"),
    metric("指标结构", String(mockDataModel.augmentation.featureCount), "动态元数据节点"),
    metric("物理约束满足率", `${Math.round(mockDataModel.augmentation.physicalConstraintRate * 100)}%`, "mock 验证指标", "low"),
  ], [
    detail("数据增强验证指标", [
      { label: "数据集版本", value: mockDataModel.augmentation.datasetVersion },
      { label: "物理约束满足率", value: `${Math.round(mockDataModel.augmentation.physicalConstraintRate * 100)}%` },
      { label: "对抗验证 AUC", value: mockDataModel.augmentation.adversarialValidationAuc },
      { label: "KS 检验通过率", value: `${Math.round(mockDataModel.augmentation.ksPassRate * 100)}%` },
      { label: "边界说明", value: mockDataModel.augmentation.boundary },
    ]),
    table("真实通道来源", [{ key: "name", label: "真实通道" }], realChannelNames.map((name) => ({ name }))),
    table("历史生成指标说明", [{ key: "name", label: "生成前兆通道" }], generatedChannelNames.map((name) => ({ name }))),
    chart("增强验证图表容器"),
  ], ["生成通道为辅助前兆指标，不替代真实传感器监测。", "不训练 WGAN-GP，不保存模型权重，不提交大型训练数据。"]),

  "/model/evaluation": page("/model/evaluation", [
    metric("召回率", `${Math.round(mockDataModel.modelEvaluation.recall * 100)}%`, "mock 评估结构", "low"),
    metric("误报率", `${Math.round(mockDataModel.modelEvaluation.falseAlarmRate * 100)}%`, "演示指标", "normal"),
    metric("Macro-F1", `${Math.round(mockDataModel.modelEvaluation.macroF1 * 100)}%`, "演示指标", "low"),
    metric("模型版本", mockDataModel.modelEvaluation.modelVersion, "mock 版本"),
  ], [
    detail("模型评估结构", [
      { label: "数据版本", value: mockDataModel.modelEvaluation.datasetVersion },
      { label: "模型版本", value: mockDataModel.modelEvaluation.modelVersion },
      { label: "混淆矩阵摘要", value: mockDataModel.modelEvaluation.confusionMatrixPlaceholder },
      { label: "消融实验摘要", value: mockDataModel.modelEvaluation.ablationPlaceholder },
    ]),
    list("评估局限性", mockDataModel.modelEvaluation.limitations),
    chart("混淆矩阵与消融实验容器"),
  ], ["不调用真实评估任务，不把 mock 指标写成正式验收指标。"]),

  "/model/version": page("/model/version", [
    metric("模型版本", String(mockDataModel.modelVersions.length), "mock 版本列表"),
    metric("当前版本", "MODEL-MOCK-1.2", "演示启用"),
    metric("回滚入口", "只读", "不执行真实回滚"),
  ], [
    table("模型版本列表", [
      { key: "version", label: "版本" },
      { key: "datasetVersion", label: "数据版本" },
      { key: "evaluationSummary", label: "评估摘要" },
      { key: "releaseAt", label: "发布时间" },
      { key: "status", label: "状态" },
      { key: "changeLog", label: "变更说明" },
    ], mockDataModel.modelVersions.map((item) => ({ ...item, status: versionStatusText[item.status] }))),
  ], ["不上传、下载、部署或回滚真实模型权重。"]),

  "/agent": page("/agent", [
    metric("推荐问题", String(mockAgent.recommendedQuestions.length), "静态问题列表"),
    metric("引用来源", String(mockAgent.citations.length), "mock 知识条目"),
    metric("模型接口", "未接入", "不调用真实大模型"),
  ], [
    list("推荐问题", mockAgent.recommendedQuestions),
    detail("mock 回答", [{ label: "回答摘要", value: mockAgent.mockAnswer }]),
    table("引用来源", [
      { key: "id", label: "条目" },
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "scenario", label: "适用场景" },
      { key: "summary", label: "摘要" },
    ], mockAgent.citations),
    list("安全提示", mockAgent.safetyPrompts),
  ], ["不接真实大模型或生产知识库，不输出强制处置命令。"]),

  "/system": page("/system", [
    metric("用户条目", String(mockSystem.users.length), "脱敏用户列表"),
    metric("角色范围", "3", "安全/监测/系统"),
    metric("操作日志", String(mockSystem.logs.length), "mock 审计摘要"),
    metric("配置项", String(mockSystem.configs.length), "只读配置状态"),
  ], [
    table("用户权限摘要", [
      { key: "name", label: "用户" },
      { key: "role", label: "角色" },
      { key: "unit", label: "单位" },
      { key: "permissionScope", label: "权限范围" },
      { key: "status", label: "状态" },
    ], mockSystem.users),
    table("操作日志摘要", [
      { key: "time", label: "时间" },
      { key: "actor", label: "操作人" },
      { key: "module", label: "模块" },
      { key: "action", label: "动作" },
      { key: "result", label: "结果" },
      { key: "risk", label: "风险级别" },
    ], mockSystem.logs.map((log) => ({ ...log, risk: log.riskLevel ? riskLevelText[log.riskLevel] : "无" }))),
    detail("系统配置摘要", mockSystem.configs),
  ], ["系统管理保持低装饰、强可读；不接真实认证、授权、审计或配置写入。"]),

  "/system/users": page("/system/users", [
    metric("用户条目", String(mockSystem.users.length), "mock 用户列表"),
    metric("角色", "3", "静态角色枚举"),
    metric("真实认证", "未接入", "只读展示"),
  ], [
    table("用户权限列表", [
      { key: "name", label: "用户" },
      { key: "role", label: "角色" },
      { key: "unit", label: "单位" },
      { key: "permissionScope", label: "权限范围" },
      { key: "status", label: "状态" },
      { key: "lastLoginAt", label: "最近登录" },
    ], mockSystem.users),
  ], ["不接真实用户系统，不展示真实个人敏感信息。"]),

  "/system/logs": page("/system/logs", [
    metric("日志条目", String(mockSystem.logs.length), "mock 日志列表"),
    metric("风险动作", "2", "演示风险级别"),
    metric("筛选项", "5", "模块/动作/结果/级别/时间"),
  ], [
    table("操作日志", [
      { key: "time", label: "时间" },
      { key: "actor", label: "操作人" },
      { key: "module", label: "模块" },
      { key: "action", label: "动作" },
      { key: "result", label: "结果" },
      { key: "risk", label: "风险级别" },
    ], mockSystem.logs.map((log) => ({ ...log, risk: log.riskLevel ? riskLevelText[log.riskLevel] : "无" }))),
  ], ["不接真实审计日志，不展示真实账号、IP 或敏感操作记录。"]),

  "/system/config": page("/system/config", [
    metric("平台参数", "4", "mock 配置项"),
    metric("刷新策略", "只读", "不保存真实参数"),
    metric("通知配置", "未接入", "不接真实渠道"),
  ], [
    detail("系统基础配置", mockSystem.configs),
    chart("配置变更影响"),
  ], ["不保存真实系统参数，不连接真实通知、认证或数据服务。"]),
};
