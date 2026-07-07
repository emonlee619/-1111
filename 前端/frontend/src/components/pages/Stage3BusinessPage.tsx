"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar, type FilterConfig } from "@/components/business/FilterBar";
import { DetailPanel } from "@/components/business/DetailPanel";
import { HazardWorkflowTimeline } from "@/components/business/HazardWorkflowTimeline";
import { DatasetVersionCard } from "@/components/business/DatasetVersionCard";
import { ChannelTrendChart } from "@/components/charts/ChannelTrendChart";
import { ConfusionMatrixCard } from "@/components/charts/ConfusionMatrixCard";
import { FeatureSourceChart } from "@/components/charts/FeatureSourceChart";
import { MetricComparisonChart } from "@/components/charts/MetricComparisonChart";
import { RegionRiskChart } from "@/components/charts/RegionRiskChart";
import { RiskTrendChart } from "@/components/charts/RiskTrendChart";
import { WarningLevelChart } from "@/components/charts/WarningLevelChart";
import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { HeroPanel } from "@/components/cockpit/HeroPanel";
import { MetricStrip } from "@/components/cockpit/MetricStrip";
import { QuickActionDock } from "@/components/cockpit/QuickActionDock";
import { SideInsightPanels } from "@/components/cockpit/SideInsightPanels";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { DataTableShell, TimelineList } from "@/components/ui/BusinessSections";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ResponsiveTableWrapper } from "@/components/ui/ResponsiveTableWrapper";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockUpdatedAt, riskLevelText, statusText } from "@/data/mockConstants";
import { mockDashboard } from "@/data/mockDashboard";
import { mockDataModel } from "@/data/mockDataModel";
import { mockDoublePrevention } from "@/data/mockDoublePrevention";
import { mockMonitoring } from "@/data/mockMonitoring";
import { mockRegionDetail, mockRegions } from "@/data/mockRegions";
import { mockSourceTracing } from "@/data/mockSourceTracing";
import { mockWarnings } from "@/data/mockWarnings";
import {
  getAblationData,
  getAttentionChartData,
  getAugmentationMetricData,
  getChannelTrendData,
  getClosureEfficiencyData,
  getFeatureSourceData,
  getFeatureUsageOptions,
  getMetricComparisonData,
  getMonitoringSummary,
  getRegionRiskChartData,
  getRiskMatrixData,
  getRiskTrendData,
  getValidationMetricData,
  getWarningLevelData,
  healthLabel,
  riskLabel,
  riskScore,
} from "@/data/selectors";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent, WarningEvent } from "@/types/business";
import type { RouteMeta } from "@/types/navigation";

type Stage3BusinessPageProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
  routeParams?: Record<string, string>;
};

const enhancedPaths = new Set([
  "/dashboard",
  "/monitoring/realtime",
  "/warning/events",
  "/warning/events/[id]",
  "/source-tracing",
  "/source-tracing/attention",
  "/regions",
  "/regions/[regionId]",
  "/double-prevention",
  "/double-prevention/hazard-workflow",
  "/data/augmentation",
  "/data/features",
  "/data/datasets",
  "/model/evaluation",
]);

export function isStage3Path(path: string) {
  return enhancedPaths.has(path);
}

function option(label: string, value: string) {
  return { label, value };
}

function shortWarningId(id: string) {
  const index = mockWarnings.events.findIndex((event) => event.id === id);
  return index >= 0 ? `W${String(index + 1).padStart(3, "0")}` : id;
}

function resolveWarningEventById(id?: string) {
  if (!id) {
    return mockWarnings.detail;
  }

  return mockWarnings.events.find((event, index) => event.id === id || `W${String(index + 1).padStart(3, "0")}` === id);
}

function tracingHrefForWarning(event: WarningEvent) {
  return `/source-tracing/events/${shortWarningId(event.id)}`;
}

function Shell({
  meta,
  content,
  children,
}: {
  meta: RouteMeta;
  content: BusinessPageContent;
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader title={meta.title} module={meta.module} description={meta.description} status={meta.status} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">mock 联动</StatusBadge>
        <StatusBadge tone="neutral">图表视图</StatusBadge>
        <StatusBadge tone="neutral">更新时间：{content.updatedAt}</StatusBadge>
      </div>
      {children}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ConsoleCard title="状态说明" description="筛选、详情与图表均由 mock 数据派生。">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            {content.statusNotes.map((note) => <li key={note}>- {cleanDisplayCopy(note)}</li>)}
            <li>- {cleanDisplayCopy("当前阶段只做本地 mock 联动，不接真实服务。")}</li>
          </ul>
        </ConsoleCard>
        <ConsoleCard title="边界说明" description="当前页面不越界到真实生产能力。">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            {content.boundaryNotes.map((note) => <li key={note}>- {cleanDisplayCopy(note)}</li>)}
          </ul>
        </ConsoleCard>
      </div>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: RouteMeta["metrics"] }) {
  return <MetricStrip metrics={metrics} />;
}

function ClickableTable<T extends { id: string }>({
  rows,
  columns,
  selectedId,
  onSelect,
}: {
  rows: T[];
  columns: { key: keyof T; label: string }[];
  selectedId?: string;
  onSelect: (row: T) => void;
}) {
  return (
    rows.length ? (
    <ResponsiveTableWrapper>
      <table className="min-w-[640px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="border-b border-line px-3 py-2 text-xs font-semibold text-muted">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={selectedId === row.id ? "bg-orange-50/80" : "cursor-pointer hover:bg-card"}
              onClick={() => onSelect(row)}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="border-b border-line/70 px-3 py-3 text-ink">
                  {String(row[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTableWrapper>
    ) : <EmptyState title="暂无筛选结果" description="当前筛选条件下没有匹配的 mock 记录，请调整筛选项。" />
  );
}

function DashboardStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={mockDashboard.metrics} />
      <div className="mt-5">
        <CockpitGrid
          left={(
            <SideInsightPanels
              panels={[
                {
                  title: "风险侧重点",
                  description: "验证左侧洞察卡片承载排行与解释说明。",
                  badge: "mock 洞察",
                  tone: "info",
                  children: (
                    <ol className="space-y-3 text-sm text-muted">
                      {mockDashboard.regionRanking.map((region, index) => (
                        <li key={region.regionId} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {index + 1}. {region.regionName}
                          </span>
                          <span className="shrink-0 font-semibold text-ink">{riskLevelText[region.riskLevel]}</span>
                        </li>
                      ))}
                    </ol>
                  ),
                },
                {
                  title: "边界说明",
                  description: "主视觉组件只承载结构，不实现真实三维。",
                  children: (
                    <p className="text-sm leading-6 text-muted">
                      当前仅用 mock 区域和风险点表达三栏驾驶舱结构，不接真实三维或生产态势数据。
                    </p>
                  ),
                },
              ]}
            />
          )}
          center={(
            <HeroPanel
              title="矿井态势主面板"
              description="中心区域用于承载巷道态势、风险矩阵、链路或知识图谱等主视觉插槽。"
              status="结构验证"
              legend={[
                { label: "正常", tone: "success" },
                { label: "关注", tone: "warning" },
                { label: "重大", tone: "danger" },
              ]}
              actions={[
                { label: "查看预警", href: "/warning/events", tone: "primary" },
                { label: "双控总览", href: "/double-prevention" },
              ]}
            >
              <div className="relative min-h-[260px] overflow-hidden rounded-[14px] border border-line bg-[#03101f]/55 p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_38%,rgba(34,211,238,0.20),transparent_24rem)]" />
                <div className="relative grid h-full gap-4 md:grid-cols-3">
                  {mockDashboard.regionRanking.map((region) => (
                    <div key={region.regionId} className="rounded-[14px] border border-line bg-card/70 p-4">
                      <p className="text-xs font-medium text-muted">{region.regionId}</p>
                      <p className="mt-2 text-base font-semibold text-ink">{region.regionName}</p>
                      <p className="mt-3 text-sm text-muted">预警 {region.warningCount} / 隐患 {region.hazardCount}</p>
                      <p className="mt-4 text-sm font-semibold text-primary">{region.controlStatus}</p>
                    </div>
                  ))}
                </div>
              </div>
            </HeroPanel>
          )}
          right={(
            <SideInsightPanels
              panels={[
                {
                  title: "待办摘取",
                  description: "验证右侧洞察卡片承载待办列表。",
                  badge: `${mockDashboard.todoTasks.length} 项`,
                  tone: "warning",
                  children: (
                    <ul className="space-y-3 text-sm text-muted">
                      {mockDashboard.todoTasks.map((task) => (
                        <li key={task.id} className="rounded-control border border-line bg-card px-3 py-2">
                          <p className="font-medium text-ink">{task.title}</p>
                          <p className="mt-1 text-xs">{task.owner} / {task.dueAt}</p>
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
          )}
        />
      </div>
      <QuickActionDock
        className="mt-5"
        actions={[
          { label: "实时监测", href: "/monitoring/realtime", description: "曲线与通道健康", status: "监测" },
          { label: "预警事件", href: "/warning/events", description: "事件处置与筛选", status: "预警" },
          { label: "风险管控", href: "/double-prevention/risk-control", description: "双控合并入口", status: "双控" },
        ]}
        statusItems={[
          { label: "数据时间", value: mockDashboard.updatedAt, tone: "info" },
          { label: "刷新状态", value: "mock 自动刷新", tone: "success" },
        ]}
        ticker="最新预警 ticker：展示底部快捷入口、状态条和 mock 事件摘要。"
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RiskTrendChart data={getRiskTrendData()} />
        <RegionRiskChart data={getRegionRiskChartData()} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ConsoleCard title="重点待办" description="来自 dashboard mock 待办列表。">
          <DataTableShell
            columns={[
              { key: "id", label: "编号" },
              { key: "title", label: "任务" },
              { key: "owner", label: "责任人" },
              { key: "dueAt", label: "期限" },
              { key: "status", label: "状态" },
            ]}
            rows={mockDashboard.todoTasks.map((task) => ({ ...task, status: statusText[task.status] }))}
          />
        </ConsoleCard>
        <ConsoleCard title="区域排行说明" description="图表与表格共用同一组区域 mock 数据。">
          <DataTableShell
            columns={[
              { key: "regionName", label: "区域" },
              { key: "risk", label: "风险等级" },
              { key: "warningCount", label: "预警" },
              { key: "hazardCount", label: "隐患" },
              { key: "controlStatus", label: "状态" },
            ]}
            rows={mockDashboard.regionRanking.map((region) => ({ ...region, risk: riskLevelText[region.riskLevel] }))}
          />
        </ConsoleCard>
      </div>
    </Shell>
  );
}

function MonitoringRealtimeStage3({ meta, content }: Stage3BusinessPageProps) {
  const [region, setRegion] = useState("all");
  const [health, setHealth] = useState("all");
  const [source, setSource] = useState("all");
  const filtered = useMemo(
    () =>
      mockMonitoring.realChannels.filter((channel) =>
        (region === "all" || channel.regionName === region) &&
        (health === "all" || channel.health === health) &&
        (source === "all" || channel.source === source)
      ),
    [region, health, source],
  );
  const selectedFallback = filtered[0];
  const [selectedId, setSelectedId] = useState(mockMonitoring.realChannels[0]?.id ?? "");
  const selected = filtered.find((channel) => channel.id === selectedId) ?? selectedFallback;
  const summary = getMonitoringSummary(filtered);
  const filters: FilterConfig[] = [
    { key: "region", label: "区域", value: region, options: [option("全部区域", "all"), ...Array.from(new Set(mockMonitoring.realChannels.map((channel) => channel.regionName))).map((name) => option(name, name))] },
    { key: "health", label: "通道状态", value: health, options: [option("全部状态", "all"), option("在线", "online"), option("校验中", "calibrating"), option("维护中", "maintenance"), option("离线", "offline")] },
    { key: "source", label: "通道类型", value: source, options: [option("全部类型", "all"), option("真实传感器", "real_sensor")] },
  ];
  const handleFilterChange = (key: string, value: string) => {
    if (key === "region") {
      setRegion(value);
    }
    if (key === "health") {
      setHealth(value);
    }
    if (key === "source") {
      setSource(value);
    }
  };
  const metrics = [
    { label: "筛选通道", value: String(filtered.length), hint: "受区域、状态、类型筛选联动", risk: "low" as const },
    { label: "在线通道", value: String(summary.online), hint: "筛选结果内在线通道" },
    { label: "需关注", value: String(summary.attention), hint: "校验或维护状态", risk: summary.attention ? "normal" as const : "low" as const },
    { label: "选中通道", value: selected?.id ?? "无", hint: selected?.name ?? "未找到通道" },
  ];
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={metrics} />
      <div className="mt-5"><FilterBar filters={filters} onChange={handleFilterChange} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ConsoleCard title="通道列表" description="点击通道后联动右侧详情与趋势图。">
          <ClickableTable
            rows={filtered.map((channel) => ({ id: channel.id, name: channel.name, region: channel.regionName, health: healthLabel[channel.health], sampleAt: channel.latestSampleAt }))}
            selectedId={selected?.id}
            onSelect={(row) => setSelectedId(row.id)}
            columns={[
              { key: "id", label: "通道" },
              { key: "name", label: "名称" },
              { key: "region", label: "区域" },
              { key: "health", label: "健康" },
              { key: "sampleAt", label: "采样时间" },
            ]}
          />
        </ConsoleCard>
        <DetailPanel
          title="通道详情"
          description="详情来自所选真实传感器通道。"
          items={selected ? [
            { label: "通道", value: selected.id },
            { label: "名称", value: selected.name },
            { label: "区域", value: selected.regionName },
            { label: "健康状态", value: healthLabel[selected.health] },
            { label: "维护责任", value: selected.maintainer },
            { label: "校验状态", value: selected.calibrationStatus },
          ] : []}
        />
      </div>
      <div className="mt-5">
        <ChannelTrendChart data={selected ? getChannelTrendData(selected) : []} title={`${selected?.name ?? "通道"}趋势图`} />
      </div>
    </Shell>
  );
}

function WarningEventsStage3({ meta, content }: Stage3BusinessPageProps) {
  const [risk, setRisk] = useState("all");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () => mockWarnings.events.filter((event) =>
      (risk === "all" || event.riskLevel === risk) &&
      (region === "all" || event.regionName === region) &&
      (status === "all" || event.status === status)
    ),
    [risk, region, status],
  );
  const [selectedId, setSelectedId] = useState(mockWarnings.events[0]?.id ?? "");
  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0];
  const filters: FilterConfig[] = [
    { key: "risk", label: "风险等级", value: risk, options: [option("全部等级", "all"), ...Object.entries(riskLabel).map(([value, label]) => option(label, value))] },
    { key: "region", label: "区域", value: region, options: [option("全部区域", "all"), ...Array.from(new Set(mockWarnings.events.map((event) => event.regionName))).map((name) => option(name, name))] },
    { key: "status", label: "处置状态", value: status, options: [option("全部状态", "all"), ...Object.entries(statusText).map(([value, label]) => option(label, value))] },
  ];
  const handleFilterChange = (key: string, value: string) => {
    if (key === "risk") {
      setRisk(value);
    }
    if (key === "region") {
      setRegion(value);
    }
    if (key === "status") {
      setStatus(value);
    }
  };
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "筛选事件", value: String(filtered.length), hint: "受等级、区域、状态联动" },
        { label: "高风险事件", value: String(filtered.filter((event) => event.riskLevel === "high" || event.riskLevel === "critical").length), hint: "较大及重大风险", risk: "high" },
        { label: "待处置", value: String(filtered.filter((event) => event.status !== "closed").length), hint: "未销号事件" },
      ]} />
      <div className="mt-5"><FilterBar filters={filters} onChange={handleFilterChange} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <WarningLevelChart data={getWarningLevelData(filtered)} />
        <ConsoleCard title="预警事件列表" description="点击事件后展示右侧详情面板。">
          <ClickableTable
            rows={filtered.map((event) => ({ id: event.id, risk: riskLevelText[event.riskLevel], region: event.regionName, status: statusText[event.status], owner: event.owner }))}
            selectedId={selected?.id}
            onSelect={(row) => setSelectedId(row.id)}
            columns={[
              { key: "id", label: "事件" },
              { key: "risk", label: "等级" },
              { key: "region", label: "区域" },
              { key: "status", label: "状态" },
              { key: "owner", label: "责任人" },
            ]}
          />
        </ConsoleCard>
      </div>
      <div className="mt-5">
        <WarningDetail event={selected} />
      </div>
    </Shell>
  );
}

function WarningDetail({ event }: { event?: WarningEvent }) {
  const detail = event
    ? {
      ...(event.id === mockWarnings.detail.id ? mockWarnings.detail : { ...event, disposalRecords: [], advice: [] }),
      tracingEntry: tracingHrefForWarning(event),
    }
    : undefined;
  return (
    <DetailPanel
      title="事件详情面板"
      description="详情由所选事件派生；非默认事件使用兼容详情占位。"
      items={detail ? [
        { label: "事件编号", value: detail.id },
        { label: "风险等级", value: riskLevelText[detail.riskLevel] },
        { label: "区域", value: detail.regionName },
        { label: "关联通道", value: detail.relatedChannels.join(", ") },
        { label: "处置状态", value: statusText[detail.status] },
        { label: "溯源入口", value: detail.tracingEntry },
      ] : []}
      timeline={detail?.disposalRecords}
    />
  );
}

function WarningEventDetailStage3({ meta, content, routeParams }: Stage3BusinessPageProps) {
  const id = routeParams?.id;
  const event = resolveWarningEventById(id);
  return (
    <Shell meta={meta} content={content}>
      {event ? (
        <>
          <MetricGrid metrics={[
            { label: "事件编号", value: event.id, hint: "按动态 id 匹配 mock 事件" },
            { label: "风险等级", value: riskLevelText[event.riskLevel], hint: "统一风险枚举", risk: event.riskLevel },
            { label: "关联通道", value: String(event.relatedChannels.length), hint: "通道趋势占位" },
          ]} />
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <WarningDetail event={event} />
            <ChannelTrendChart data={getChannelTrendData(mockMonitoring.realChannels.find((channel) => channel.id === event.relatedChannels[0]))} title="关联通道曲线" />
          </div>
        </>
      ) : (
        <ErrorState title="未找到预警事件" description={`当前 mock 数据中没有事件 id：${id ?? "未提供"}`} />
      )}
    </Shell>
  );
}

function SourceTracingStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "贡献指标", value: String(mockSourceTracing.attentionWeights.length), hint: "注意力权重排行" },
        { label: "解释窗口", value: "30 min", hint: "mock 时间窗" },
        { label: "最高权重", value: `${Math.round(mockSourceTracing.attentionWeights[0].weight * 100)}%`, hint: mockSourceTracing.attentionWeights[0].feature, risk: "normal" },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <MetricComparisonChart data={getAttentionChartData().map((item) => ({ name: item.name, value: item.weight }))} title="注意力权重排行" />
        <ConsoleCard title="致因链路" description="仅作辅助解释，不作为最终事故原因。">
          <TimelineList items={mockSourceTracing.causalChain} />
        </ConsoleCard>
      </div>
    </Shell>
  );
}

function RegionsStage3({ meta, content }: Stage3BusinessPageProps) {
  const [selectedId, setSelectedId] = useState(mockRegions[0].regionId);
  const selected = mockRegions.find((region) => region.regionId === selectedId);
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "区域数量", value: String(mockRegions.length), hint: "mock 区域列表" },
        { label: "重点区域", value: String(mockRegions.filter((region) => riskScore[region.riskLevel] >= 3).length), hint: "较大及以上", risk: "high" },
        { label: "关联预警", value: String(mockRegions.reduce((sum, region) => sum + region.warningCount, 0)), hint: "区域预警合计" },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RegionRiskChart data={getRegionRiskChartData()} />
        <ConsoleCard title="区域列表" description="点击区域联动详情。">
          <ClickableTable
            rows={mockRegions.map((region) => ({ id: region.regionId, region: region.regionName, risk: riskLevelText[region.riskLevel], warnings: String(region.warningCount), hazards: String(region.hazardCount), status: region.controlStatus }))}
            selectedId={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
            columns={[
              { key: "id", label: "编号" },
              { key: "region", label: "区域" },
              { key: "risk", label: "等级" },
              { key: "warnings", label: "预警" },
              { key: "hazards", label: "隐患" },
              { key: "status", label: "状态" },
            ]}
          />
        </ConsoleCard>
      </div>
      <div className="mt-5">
        <DetailPanel
          title="区域详情"
          items={selected ? [
            { label: "区域", value: selected.regionName },
            { label: "风险等级", value: riskLevelText[selected.riskLevel] },
            { label: "隐患数", value: selected.hazardCount },
            { label: "预警数", value: selected.warningCount },
            { label: "管控状态", value: selected.controlStatus },
          ] : []}
        />
      </div>
    </Shell>
  );
}

function RegionDetailStage3({ meta, content, routeParams }: Stage3BusinessPageProps) {
  const regionId = routeParams?.regionId;
  const region = regionId === mockRegionDetail.regionId || regionId === undefined ? mockRegionDetail : undefined;
  return (
    <Shell meta={meta} content={content}>
      {region ? (
        <>
          <MetricGrid metrics={[
            { label: "当前风险", value: riskLevelText[region.riskLevel], hint: "按 regionId 匹配", risk: region.riskLevel },
            { label: "关联传感器", value: String(region.relatedSensors.length), hint: "mock 点位" },
            { label: "关联隐患", value: String(region.relatedHazards.length), hint: "mock 隐患" },
          ]} />
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <DetailPanel title="区域基础信息" items={[
              { label: "区域", value: region.regionName },
              { label: "管控状态", value: region.controlStatus },
              { label: "最近更新", value: region.updatedAt },
              { label: "管控措施", value: region.controlMeasures.join("；") },
            ]} timeline={region.warningHistory} />
            <RegionRiskChart data={getRegionRiskChartData([region])} />
          </div>
        </>
      ) : (
        <ErrorState title="未找到区域" description={`当前 mock 数据中没有区域 id：${regionId ?? "未提供"}`} />
      )}
    </Shell>
  );
}

function DoublePreventionStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "风险管控项", value: String(mockDoublePrevention.riskControls.length), hint: "风险清单" },
        { label: "闭环效率", value: "50%", hint: "已完成步骤占比", risk: "normal" },
        { label: "逾期事项", value: String(mockDoublePrevention.overdueItems.length), hint: "待升级事项", risk: "high" },
        { label: "重点待办", value: String(mockDoublePrevention.hazards.length), hint: "隐患台账" },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RegionRiskChart data={getRiskMatrixData().map((item) => ({ ...item, warnings: item.riskScore, hazards: item.riskScore }))} />
        <FeatureSourceChart data={getClosureEfficiencyData()} title="闭环效率分布" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ConsoleCard title="逾期事项" description="不发送真实升级通知。">
          <DataTableShell
            columns={[
              { key: "hazardId", label: "隐患" },
              { key: "owner", label: "责任人" },
              { key: "overdueDays", label: "逾期天数" },
              { key: "escalationLevel", label: "升级级别" },
              { key: "suggestion", label: "建议" },
            ]}
            rows={mockDoublePrevention.overdueItems}
          />
        </ConsoleCard>
        <ConsoleCard title="重点待办" description="来自隐患台账 mock 数据。">
          <DataTableShell
            columns={[
              { key: "id", label: "编号" },
              { key: "description", label: "隐患" },
              { key: "step", label: "步骤" },
              { key: "owner", label: "责任人" },
            ]}
            rows={mockDoublePrevention.hazards.map((hazard) => ({ id: hazard.id, description: hazard.description, step: hazard.currentStep, owner: hazard.owner }))}
          />
        </ConsoleCard>
      </div>
    </Shell>
  );
}

function HazardWorkflowStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "固定步骤", value: "8", hint: "整理到销号" },
        { label: "已完成", value: String(mockDoublePrevention.workflowSteps.filter((step) => step.status === "done").length), hint: "mock 进度" },
        { label: "当前节点", value: mockDoublePrevention.workflowSteps.find((step) => step.status === "active")?.name ?? "无", hint: "八步闭环" },
      ]} />
      <div className="mt-5">
        <HazardWorkflowTimeline steps={mockDoublePrevention.workflowSteps} />
      </div>
    </Shell>
  );
}

function DataAugmentationStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "真实通道", value: String(mockDataModel.augmentation.realChannelCount), hint: "以后端元数据为准", risk: "low" },
        { label: "生成通道", value: String(mockDataModel.augmentation.generatedChannelCount), hint: "历史遗留说明", risk: "normal" },
        { label: "指标总数", value: String(mockDataModel.augmentation.featureCount), hint: "动态元数据节点" },
        { label: "数据集版本", value: mockDataModel.augmentation.datasetVersion, hint: "mock 版本" },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <FeatureSourceChart data={getAugmentationMetricData()} title="通道与指标结构" />
        <MetricComparisonChart data={getValidationMetricData()} title="增强验证指标" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <DatasetVersionCard version={mockDataModel.datasetVersions[0]} />
        <ConsoleCard title="生成通道边界说明" description="WGAN-GP 仅展示增强结果，不训练模型。">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            <li>- 生成通道为辅助前兆指标，不替代真实传感器监测。</li>
            <li>- 不保存模型权重，不提交大型训练数据。</li>
            <li>- 图表数据来自 mockDataModel.augmentation。</li>
          </ul>
        </ConsoleCard>
      </div>
    </Shell>
  );
}

function DataFeaturesStage3({ meta, content }: Stage3BusinessPageProps) {
  const [type, setType] = useState("all");
  const [usage, setUsage] = useState("all");
  const filtered = useMemo(
    () => mockDataModel.featureDictionary.filter((feature) =>
      (type === "all" || feature.type === type) &&
      (usage === "all" || feature.modelUsage === usage)
    ),
    [type, usage],
  );
  const filters: FilterConfig[] = [
    { key: "type", label: "指标类型", value: type, options: [option("全部类型", "all"), option("真实通道", "real_channel"), option("生成通道", "generated_channel")] },
    { key: "usage", label: "模型用途", value: usage, options: [option("全部用途", "all"), ...getFeatureUsageOptions().map((item) => option(item, item))] },
  ];
  const handleFilterChange = (key: string, value: string) => {
    if (key === "type") {
      setType(value);
    }
    if (key === "usage") {
      setUsage(value);
    }
  };
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "筛选指标", value: String(filtered.length), hint: "筛选结果联动" },
        { label: "真实通道", value: String(filtered.filter((feature) => feature.type === "real_channel").length), hint: "真实传感器来源", risk: "low" },
        { label: "生成通道", value: String(filtered.filter((feature) => feature.type === "generated_channel").length), hint: "辅助前兆指标", risk: "normal" },
      ]} />
      <div className="mt-5"><FilterBar filters={filters} onChange={handleFilterChange} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <FeatureSourceChart data={getFeatureSourceData(filtered)} />
        <ConsoleCard title="后端指标字典" description="筛选结果影响列表与图表。">
          <DataTableShell
            columns={[
              { key: "id", label: "编号" },
              { key: "name", label: "名称" },
              { key: "type", label: "类型" },
              { key: "source", label: "来源" },
              { key: "usage", label: "用途" },
            ]}
            rows={filtered.map((feature) => ({ id: feature.id, name: feature.name, type: feature.type === "real_channel" ? "真实通道" : "生成通道", source: feature.sourceChannel, usage: feature.modelUsage }))}
          />
        </ConsoleCard>
      </div>
    </Shell>
  );
}

function DataDatasetsStage3({ meta, content }: Stage3BusinessPageProps) {
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "数据集版本", value: String(mockDataModel.datasetVersions.length), hint: "mock 版本列表" },
        { label: "最新质量评分", value: String(mockDataModel.datasetVersions[0].qualityScore), hint: "演示质量指标", risk: "low" },
        { label: "通道覆盖", value: mockDataModel.datasetVersions[0].channelCoverage, hint: "真实 + 生成指标覆盖" },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <DatasetVersionCard version={mockDataModel.datasetVersions[0]} />
        <RegionRiskChart data={mockDataModel.datasetVersions.map((version) => ({ name: version.version, riskScore: Math.round(version.qualityScore / 25), warnings: version.sampleCount / 1000, hazards: Number(version.channelCoverage.split("/")[0]) }))} />
      </div>
    </Shell>
  );
}

function ModelEvaluationStage3({ meta, content }: Stage3BusinessPageProps) {
  const evaluation = mockDataModel.modelEvaluation;
  return (
    <Shell meta={meta} content={content}>
      <MetricGrid metrics={[
        { label: "召回率", value: `${Math.round(evaluation.recall * 100)}%`, hint: "mock 评估指标", risk: "low" },
        { label: "误报率", value: `${Math.round(evaluation.falseAlarmRate * 100)}%`, hint: "mock 评估指标", risk: "normal" },
        { label: "Macro-F1", value: `${Math.round(evaluation.macroF1 * 100)}%`, hint: "mock 评估指标", risk: "low" },
        { label: "准确率", value: `${Math.round((evaluation.accuracy ?? 0) * 100)}%`, hint: evaluation.evaluatedAt ?? mockUpdatedAt },
      ]} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <MetricComparisonChart data={getMetricComparisonData()} />
        <MetricComparisonChart data={getAblationData().map((item) => ({
          name: item.name,
          recall: Math.round(item.recall * 100),
          falseAlarmRate: Math.round(item.falseAlarmRate * 100),
          macroF1: Math.round(item.macroF1 * 100),
          accuracy: Math.round(item.accuracy * 100),
        }))} title="消融实验对比" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ConfusionMatrixCard cells={evaluation.confusionMatrix ?? []} />
        <DetailPanel title="评估版本与局限性" items={[
          { label: "数据版本", value: evaluation.datasetVersion },
          { label: "模型版本", value: evaluation.modelVersion },
          { label: "评估时间", value: evaluation.evaluatedAt ?? mockUpdatedAt },
          { label: "局限性", value: evaluation.limitations.join("；") },
        ]} />
      </div>
    </Shell>
  );
}

export function Stage3BusinessPage({ meta, content, routeParams }: Stage3BusinessPageProps) {
  if (!enhancedPaths.has(content.path)) {
    return null;
  }
  switch (content.path) {
    case "/dashboard":
      return <DashboardStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/monitoring/realtime":
      return <MonitoringRealtimeStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/warning/events":
      return <WarningEventsStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/warning/events/[id]":
      return <WarningEventDetailStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/source-tracing":
    case "/source-tracing/attention":
      return <SourceTracingStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/regions":
      return <RegionsStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/regions/[regionId]":
      return <RegionDetailStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/double-prevention":
      return <DoublePreventionStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/double-prevention/hazard-workflow":
      return <HazardWorkflowStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/data/augmentation":
      return <DataAugmentationStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/data/features":
      return <DataFeaturesStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/data/datasets":
      return <DataDatasetsStage3 meta={meta} content={content} routeParams={routeParams} />;
    case "/model/evaluation":
      return <ModelEvaluationStage3 meta={meta} content={content} routeParams={routeParams} />;
    default:
      return null;
  }
}
