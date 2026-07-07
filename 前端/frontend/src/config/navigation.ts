import type { NavigationGroup, NavigationItem } from "@/types/navigation";

export const navigation: NavigationGroup[] = [
  {
    title: "综合驾驶舱",
    href: "/dashboard",
    icon: "Gauge",
    description: "全局安全态势、重点区域、预警趋势和待办处置总览。",
    status: "总览入口",
    items: [
      { title: "总览", href: "/dashboard" },
    ],
    hiddenItems: [
      { title: "平台入口", href: "/", isHidden: true },
      { title: "区域风险中心", href: "/regions", isHidden: true },
      { title: "区域详情", href: "/regions/[regionId]", demoHref: "/regions/R001", isHidden: true },
    ],
  },
  {
    title: "监测预警",
    href: "/monitoring",
    icon: "Activity",
    description: "监测通道、实时曲线、通道健康和预警事件的监测侧入口。",
    status: "监测侧",
    items: [
      { title: "总览", href: "/monitoring" },
      { title: "实时监测", href: "/monitoring/realtime" },
      { title: "通道管理", href: "/monitoring/channels" },
      { title: "预警事件", href: "/warning/events" },
    ],
    hiddenItems: [
      { title: "预警概览", href: "/warning", isHidden: true },
      { title: "预警事件详情", href: "/warning/events/[id]", demoHref: "/warning/events/W001", isHidden: true },
    ],
  },
  {
    title: "溯源研判",
    href: "/source-tracing",
    icon: "GitBranch",
    description: "注意力分析、致因链路和事件辅助解释，不替代人工复核。",
    status: "辅助解释",
    items: [
      { title: "总览", href: "/source-tracing" },
      { title: "注意力分析", href: "/source-tracing/attention" },
      { title: "致因链路", href: "/source-tracing" },
    ],
    hiddenItems: [
      { title: "事件追踪", href: "/source-tracing/events/[id]", demoHref: "/source-tracing/events/W001", isHidden: true },
    ],
  },
  {
    title: "双重预防",
    href: "/double-prevention",
    icon: "ShieldAlert",
    description: "风险管控、隐患治理和闭环复盘的双控业务入口。",
    status: "双控闭环",
    items: [
      { title: "总览", href: "/double-prevention" },
      { title: "风险管控", href: "/double-prevention/risk-control" },
      { title: "隐患治理", href: "/double-prevention/hazard-governance" },
      { title: "闭环复盘", href: "/double-prevention/review" },
    ],
    hiddenItems: [
      { title: "风险四色图", href: "/double-prevention/risk-map", isHidden: true },
      { title: "风险告知卡", href: "/double-prevention/risk-cards", isHidden: true },
      { title: "告知卡详情", href: "/double-prevention/risk-cards/[id]", demoHref: "/double-prevention/risk-cards/RC001", isHidden: true },
      { title: "措施库", href: "/double-prevention/measure-library", isHidden: true },
      { title: "隐患台账", href: "/double-prevention/hazard-ledger", isHidden: true },
      { title: "隐患详情", href: "/double-prevention/hazard-ledger/[id]", demoHref: "/double-prevention/hazard-ledger/H001", isHidden: true },
      { title: "八步闭环", href: "/double-prevention/hazard-workflow", isHidden: true },
      { title: "逾期升级", href: "/double-prevention/overdue-escalation", isHidden: true },
      { title: "双控配置", href: "/double-prevention/config", isHidden: true },
      { title: "双控文化展板", href: "/double-prevention/culture-board", isHidden: true },
    ],
  },
  {
    title: "数字孪生",
    href: "/twin",
    icon: "Boxes",
    description: "巷道态势、风险热力和传感器点位的空间态势入口。",
    status: "空间态势",
    items: [
      { title: "总览", href: "/twin" },
      { title: "巷道态势", href: "/twin/tunnel" },
      { title: "风险热力", href: "/twin/risk-heatmap" },
      { title: "传感器点位", href: "/twin/sensors" },
    ],
  },
  {
    title: "数据模型",
    href: "/data",
    icon: "Database",
    description: "数据资产、数据增强、模型评估和版本管理入口。",
    status: "展示边界",
    items: [
      { title: "总览", href: "/data" },
      { title: "数据资产", href: "/data/features" },
      { title: "数据增强", href: "/data/augmentation" },
      { title: "模型评估", href: "/model/evaluation" },
      { title: "版本管理", href: "/model/version" },
    ],
    hiddenItems: [
      { title: "动态数据", href: "/data/dynamic", isHidden: true },
      { title: "静态数据", href: "/data/static", isHidden: true },
      { title: "静态导入", href: "/data/static/import", isHidden: true },
      { title: "数据集版本", href: "/data/datasets", isHidden: true },
      { title: "模型入口", href: "/model", isHidden: true },
    ],
  },
  {
    title: "知识智能",
    href: "/knowledge",
    icon: "BrainCircuit",
    description: "知识库总览、规则指标、智能问答与致灾图谱的知识侧入口，后端接入 FastAPI 知识库服务。",
    status: "知识辅助",
    items: [
      { title: "总览", href: "/knowledge" },
      { title: "知识库总览", href: "/knowledge/overview" },
      { title: "规则知识库", href: "/knowledge/rules" },
      { title: "标准检索", href: "/knowledge/search" },
      { title: "致灾图谱", href: "/knowledge/causal-graph" },
      { title: "智能问答", href: "/knowledge/assistant" },
    ],
    hiddenItems: [
      { title: "知识文化展板", href: "/knowledge/culture-board", isHidden: true },
      { title: "案例标准库", href: "/knowledge/cases", isHidden: true },
      { title: "AI 问答入口", href: "/agent", isHidden: true },
    ],
  },
  {
    title: "系统管理",
    href: "/system",
    icon: "Settings",
    description: "用户权限、操作日志和系统配置的管理入口。",
    status: "可读优先",
    items: [
      { title: "总览", href: "/system" },
      { title: "用户权限", href: "/system/users" },
      { title: "操作日志", href: "/system/logs" },
      { title: "系统配置", href: "/system/config" },
    ],
  },
];

const dynamicSegmentPattern = /^\[[^\]]+\]$/;

function matchesRouteTemplate(pathname: string, routeTemplate: string) {
  const templateParts = routeTemplate.split("/");
  const pathnameParts = pathname.split("/");

  if (templateParts.length !== pathnameParts.length) {
    return false;
  }

  return templateParts.every((part, index) => dynamicSegmentPattern.test(part) || part === pathnameParts[index]);
}

export function getNavigationItems(group: NavigationGroup) {
  return [...group.items, ...(group.hiddenItems ?? [])];
}

export function getVisibleNavigationItems(group: NavigationGroup) {
  return group.items.filter((item) => !item.isHidden && item.visibleInSidebar !== false);
}

export function getNavigationHref(item: NavigationItem) {
  return item.demoHref ?? item.href;
}

export function matchesNavigationItem(pathname: string, item: NavigationItem) {
  if (matchesRouteTemplate(pathname, item.href)) {
    return true;
  }

  if (item.demoHref && pathname === item.demoHref) {
    return true;
  }

  return pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
}

export function matchesNavigationGroup(pathname: string, group: NavigationGroup) {
  const groupHrefMatches = group.href ? pathname === group.href || (group.href !== "/" && pathname.startsWith(`${group.href}/`)) : false;
  return groupHrefMatches || getNavigationItems(group).some((item) => matchesNavigationItem(pathname, item));
}

export function findNavigationGroup(pathname: string) {
  return navigation.find((group) => matchesNavigationGroup(pathname, group));
}

export function findActiveNavigationItem(pathname: string, group: NavigationGroup) {
  const visibleItems = getVisibleNavigationItems(group);

  return visibleItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesNavigationItem(pathname, item))
    .sort((a, b) => b.item.href.length - a.item.href.length || a.index - b.index)[0]?.item;
}
