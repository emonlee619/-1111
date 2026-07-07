import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardCheck,
  Gauge,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";
import {
  CockpitBottomTicker,
  CockpitHeroPanel,
  CockpitMetricCard,
  CockpitPageFrame,
  CockpitSectionPanel,
} from "@/components/cockpit";
import {
  DashboardMineSituationVisual,
  DoublePreventionControlVisual,
  MonitoringTrendConsoleVisual,
} from "@/components/cockpit/ProductionOverviewVisuals";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockDashboard } from "@/data/mockDashboard";
import { mockDoublePrevention } from "@/data/mockDoublePrevention";
import { mockMonitoring } from "@/data/mockMonitoring";
import { mockWarnings } from "@/data/mockWarnings";
import { getClosureEfficiencyData, getMonitoringSummary, getWarningLevelData, riskLabel } from "@/data/selectors";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent } from "@/types/business";
import type { CockpitMetricView, QuickActionItem } from "@/types/cockpit";
import type { RouteMeta } from "@/types/navigation";
import type { RiskLevel, StatusTone } from "@/types/risk";
import type { LucideIcon } from "lucide-react";

type Stage4CoreShowcasePageProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
};

const stage4Paths = new Set(["/dashboard", "/monitoring", "/double-prevention"]);

const handlingLabel: Record<string, string> = {
  pending: "待确认",
  verifying: "复核中",
  handling: "处置中",
  reviewing: "验收中",
  closed: "已关闭",
};

const riskWeight: Record<RiskLevel, number> = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};

export function isStage4Path(path: string) {
  return stage4Paths.has(path);
}

function iconNode(Icon: LucideIcon) {
  return <Icon className="h-4 w-4" aria-hidden />;
}

function renderDisplayCopy(value: React.ReactNode) {
  return typeof value === "string" ? cleanDisplayCopy(value) : value;
}

function MetricRow({ metrics }: { metrics: CockpitMetricView[] }) {
  return (
    <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <CockpitMetricCard key={`${metric.label}-${metric.value}`} metric={metric} />
      ))}
    </div>
  );
}

function CockpitColumns({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-3 xl:h-[456px] xl:grid-cols-[minmax(230px,0.88fr)_minmax(0,1.76fr)_minmax(230px,0.88fr)]">
      <aside className="order-2 grid min-h-0 min-w-0 content-start gap-3 overflow-hidden xl:order-1">{left}</aside>
      <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">{center}</div>
      <aside className="order-3 grid min-h-0 min-w-0 content-start gap-3 overflow-hidden">{right}</aside>
    </div>
  );
}

function DenseList({
  items,
}: {
  items: { label: string; value: string; meta?: string; tone?: StatusTone; risk?: RiskLevel }[];
}) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`} className="min-w-0 rounded-[5px] border border-cyan-300/14 bg-[#03101f]/42 px-2.5 py-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-ink">{cleanDisplayCopy(item.label)}</span>
            {item.risk ? <RiskLevelBadge level={item.risk} /> : <StatusBadge tone={item.tone ?? "neutral"}>{cleanDisplayCopy(item.value)}</StatusBadge>}
          </div>
          {item.meta ? <p className="mt-1 truncate text-xs text-muted">{cleanDisplayCopy(item.meta)}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function DonutSummary({
  value,
  label,
  color = "#22d3ee",
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="14" />
          <circle cx="60" cy="60" r="46" fill="none" stroke={color} strokeWidth="14" strokeDasharray="225 290" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold text-ink">{cleanDisplayCopy(value)}</span>
          <span className="text-[11px] text-muted">{cleanDisplayCopy(label)}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-xs text-muted">
        <div className="flex justify-between gap-2"><span>正常</span><span className="text-success">92%</span></div>
        <div className="flex justify-between gap-2"><span>关注</span><span className="text-warning">6%</span></div>
        <div className="flex justify-between gap-2"><span>异常</span><span className="text-danger">2%</span></div>
      </div>
    </div>
  );
}

function QuickAccessDock({ actions }: { actions: QuickActionItem[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href ?? "#"}
          className="cockpit-chamfer-md group relative min-h-[88px] overflow-hidden rounded-[7px] border border-[var(--mine-border)] bg-[#061a31]/78 p-3 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)]"
        >
          <span className="absolute inset-x-3 top-0 h-px bg-cyan-200/50" />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-cyan-300/28 bg-cyan-300/10 text-primary">
              {action.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{cleanDisplayCopy(action.label)}</span>
              {action.description ? <span className="mt-1 block truncate text-xs text-muted">{cleanDisplayCopy(action.description)}</span> : null}
            </span>
          </div>
          {action.status ? <span className="absolute bottom-3 right-3 text-xs text-primary">{cleanDisplayCopy(action.status)}</span> : null}
        </Link>
      ))}
    </section>
  );
}

function BoundaryNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border border-cyan-300/14 bg-[#03101f]/44 px-3 py-2 text-xs leading-5 text-muted">
      {renderDisplayCopy(children)}
    </div>
  );
}

function DashboardSectionPanel(props: React.ComponentProps<typeof CockpitSectionPanel>) {
  return <CockpitSectionPanel {...props} variant="blueBeam" />;
}

function DashboardMineVisual() {
  return (
    <DashboardMineSituationVisual
      areas={mockDashboard.productionAreas}
      points={mockDashboard.productionPoints}
      flows={mockDashboard.ventilationFlows}
    />
  );
}

function MonitoringTrendVisual() {
  return (
    <MonitoringTrendConsoleVisual channels={mockMonitoring.trendChannels} />
  );
}

function DoubleControlVisual() {
  return (
    <DoublePreventionControlVisual
      riskMap={mockDoublePrevention.riskMap}
      hazards={mockDoublePrevention.hazards}
      measures={mockDoublePrevention.measures}
      steps={mockDoublePrevention.workflowSteps}
    />
  );
}

function DashboardStage4(props: Stage4CoreShowcasePageProps) {
  const sensorHighlights = [...mockDashboard.productionPoints]
    .sort((a, b) => riskWeight[b.riskLevel] - riskWeight[a.riskLevel])
    .slice(0, 2);

  return (
    <CockpitPageFrame {...props} kicker="左中右综合态势驾驶舱" compactStatus="演示态势快照">
      <MetricRow
        metrics={[
          { label: "当前综合风险", value: "一般风险", hint: "阈值口径：CH4 1.0% / 风速 0.25m/s", trend: `更新 ${mockDashboard.updatedAt}`, risk: "normal", icon: iconNode(ShieldCheck), tone: "cyan", status: "关注" },
          { label: "实时预警", value: "6", unit: "条", hint: "近1小时触发，重点展示 3 条", trend: "较昨日 +2 / 待确认 2", risk: "high", icon: iconNode(Bell), tone: "amber", status: "待确认" },
          { label: "重大隐患", value: "3", unit: "条", hint: "八步闭环治理中，含逾期复核", trend: "责任单位：通风区/采掘队", risk: "critical", icon: iconNode(AlertTriangle), tone: "red", status: "治理中" },
          { label: "双控闭环率", value: "86", unit: "%", hint: "mock 台账统计，复盘独立", trend: "本周 +4% / 逾期 1", risk: "low", icon: iconNode(Target), tone: "green", status: "稳定" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <DashboardSectionPanel title="重点区域风险排行" badge="Top 2" tone="warning" moreHref="/regions">
              <DenseList
                items={mockDashboard.regionRanking.slice(0, 2).map((region, index) => ({
                  label: `${index + 1}. ${region.regionName}`,
                  value: riskLabel[region.riskLevel],
                  meta: `预警 ${region.warningCount} / 隐患 ${region.hazardCount}`,
                  risk: region.riskLevel,
                }))}
              />
            </DashboardSectionPanel>
            <DashboardSectionPanel title="关键传感器状态" badge={`${mockDashboard.productionPoints.length} 点`} tone="info">
              <DenseList
                items={sensorHighlights.map((point) => ({
                  label: `${point.code} ${point.pointType}`,
                  value: point.status,
                  meta: `${point.value}${point.unit} / 阈值 ${point.threshold}${point.unit} / ${point.owner}`,
                  risk: point.riskLevel,
                }))}
              />
            </DashboardSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="矿井安全态势主视觉"
            description="主斜井、运输巷、回风巷、采掘面与传感器点位共同表达当前风险位置、阈值和通风方向。"
            modeLabel="态势模式"
            modes={["三维线框", "平面态势"]}
            activeMode="三维线框"
            legend={[
              { label: "正常", tone: "success" },
              { label: "关注", tone: "warning" },
              { label: "较大/重大风险", tone: "danger" },
            ]}
          >
            <DashboardMineVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <DashboardSectionPanel title="风险处置概览" badge="闭环" tone="danger" moreHref="/warning/events">
              <DonutSummary value="6" label="预警总数" color="#f97316" />
            </DashboardSectionPanel>
            <DashboardSectionPanel title="待办处置与责任人" badge={`${mockDashboard.todoTasks.length} 项`} tone="warning">
              <DenseList
                items={mockDashboard.todoTasks.map((task) => ({
                  label: task.title,
                  value: task.owner,
                  meta: `${task.dueAt} / ${handlingLabel[task.status] ?? task.status}`,
                  risk: task.riskLevel,
                }))}
              />
            </DashboardSectionPanel>
            <DashboardSectionPanel title="最新告警与处置" badge="mock" tone="info">
              <DenseList
                items={mockDashboard.latestAlerts.map((alert) => ({
                  label: `${alert.area} / ${alert.point}`,
                  value: alert.status,
                  meta: `${alert.currentValue}${alert.unit} / 阈值 ${alert.threshold}${alert.unit} / ${alert.owner} / ${alert.updatedAt}`,
                  risk: alert.riskLevel,
                }))}
              />
            </DashboardSectionPanel>
          </>
        )}
      />
      <CockpitBottomTicker
        level={mockDashboard.latestAlerts[0]?.riskLevel ?? "high"}
        summary={`${mockDashboard.latestAlerts[0]?.area ?? "中部采掘区"} ${mockDashboard.latestAlerts[0]?.point ?? "CH4-03"} 当前 ${mockDashboard.latestAlerts[0]?.currentValue ?? 1.12}${mockDashboard.latestAlerts[0]?.unit ?? "%"}，阈值 ${mockDashboard.latestAlerts[0]?.threshold ?? 1}${mockDashboard.latestAlerts[0]?.unit ?? "%"}，状态 ${mockDashboard.latestAlerts[0]?.status ?? "处置中"}。`}
        area={`${mockDashboard.latestAlerts[0]?.owner ?? "通风区值班长"} / 快捷入口：预警事件、风险区域、隐患闭环`}
        href={mockDashboard.latestAlerts[0]?.href ?? "/warning/events"}
        updatedAt={mockDashboard.updatedAt}
      />
      <BoundaryNote>mock 边界：综合驾驶舱不接真实监测流、真实告警接口或生产处置系统，仅展示演示态势与页面结构。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function MonitoringStage4(props: Stage4CoreShowcasePageProps) {
  const summary = getMonitoringSummary(mockMonitoring.realChannels);
  const healthRate = Math.round((summary.online / summary.total) * 100);
  const warningLevels = getWarningLevelData(mockWarnings.events);
  return (
    <CockpitPageFrame {...props} kicker="实时监测 / 通道健康 / 预警联动" compactStatus="真实通道 mock">
      <MetricRow
        metrics={[
          { label: "真实传感器通道", value: String(summary.total), unit: "路", hint: "仅统计真实传感器，生成通道不计入", trend: "采样窗口 1小时 / 30s刷新", risk: "low", icon: iconNode(Activity), tone: "cyan", status: "真实" },
          { label: "异常通道数", value: String(summary.attention), unit: "路", hint: "离线、漂移校验或维护中", trend: "需人工复核", risk: summary.attention ? "normal" : "low", icon: iconNode(AlertTriangle), tone: "amber", status: "关注" },
          { label: "实时预警数", value: String(mockWarnings.events.length), unit: "条", hint: "含待确认、处置中、已确认状态", trend: "高风险 2 条 / 责任人已绑定", risk: "high", icon: iconNode(Bell), tone: "red", status: "处置中" },
          { label: "通道健康率", value: String(healthRate), unit: "%", hint: "在线通道 / 全部真实通道", trend: `最近采样 ${mockMonitoring.updatedAt}`, risk: "low", icon: iconNode(Gauge), tone: "green", status: "良好" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="关键通道阈值" badge="多通道" tone="warning">
              <DenseList
                items={mockMonitoring.trendChannels.slice(0, 5).map((channel) => ({
                  label: `${channel.code} ${channel.label}`,
                  value: channel.status,
                  meta: `${channel.currentValue}${channel.unit} / 阈值 ${channel.threshold}${channel.unit} / ${channel.updatedAt}`,
                  tone: channel.currentValue >= channel.threshold ? "warning" : "success",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="通道健康分布" badge={`${healthRate}%`} tone="info">
              <DenseList
                items={mockMonitoring.channelHealth.map((item) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: item.label.includes("异常") ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="预警等级分布" badge={`${mockWarnings.events.length} 条`} tone="danger">
              <DenseList
                items={warningLevels.map((item) => ({
                  label: item.name,
                  value: `${item.count} 条`,
                  meta: "预警事件 mock 摘要",
                  tone: item.level === "critical" ? "danger" : item.level === "high" || item.level === "normal" ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="实时多通道趋势曲线"
            description="中心大屏展示 CH4、CO、风速、粉尘等真实传感器通道的 mock 短窗趋势。"
            modeLabel="趋势窗口"
            modes={["实时", "1小时", "6小时", "自定义"]}
            activeMode="1小时"
            legend={[
              { label: "真实传感器", value: `${summary.total} 路`, tone: "info" },
              { label: "异常/维护", value: `${summary.attention} 路`, tone: "warning" },
            ]}
          >
            <MonitoringTrendVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="设备 / 通道健康度" badge={`${healthRate}分`} tone="success">
              <DonutSummary value={`${healthRate}`} label="健康度" color="#10b981" />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="事件确认状态" badge="最近" tone="warning" moreHref="/warning/events">
              <DenseList
                items={mockWarnings.events.slice(0, 4).map((event) => ({
                  label: event.summary,
                  value: event.confirmStatus ?? handlingLabel[event.status] ?? event.status,
                  meta: `${event.triggerPoint ?? event.regionName} / 超限 ${event.overLimitRatio ?? "--"} / ${event.owner}`,
                  risk: event.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="高风险责任人" badge="超限" tone="danger">
              <DenseList
                items={mockWarnings.events.filter((event) => event.riskLevel === "high" || event.riskLevel === "critical").map((event) => ({
                  label: event.triggerPoint ?? event.regionName,
                  value: event.owner,
                  meta: `${event.currentValue ?? "--"}${event.unit ?? ""} / 阈值 ${event.threshold ?? "--"}${event.unit ?? ""} / ${event.eventTime.slice(11)}`,
                  risk: event.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "采样窗口", href: "/monitoring/realtime", description: "1小时趋势 / 30s刷新", status: "窗口", icon: iconNode(Activity) },
          { label: "通道健康", href: "/monitoring/channels", description: `在线 ${summary.online}/${summary.total}，维护 ${summary.attention}`, status: "设备", icon: iconNode(Wrench) },
          { label: "最近异常", href: "/warning/events", description: mockMonitoring.abnormalFluctuations[0]?.title ?? "待人工复核", status: mockMonitoring.abnormalFluctuations[0]?.time ?? "09:14", icon: iconNode(AlertTriangle) },
          { label: "预警统计/策略", href: "/warning", description: "确认状态、责任人与阈值口径", status: "策略", icon: iconNode(BarChart3) },
        ]}
      />
      <BoundaryNote>mock 边界：不订阅 WebSocket、MQTT、SSE 或生产监测接口；所有通道状态和采样时间均为演示数据。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function DoublePreventionStage4(props: Stage4CoreShowcasePageProps) {
  const critical = mockDoublePrevention.riskMap.filter((item) => item.riskLevel === "critical").length;
  const high = mockDoublePrevention.riskMap.filter((item) => item.riskLevel === "high").length;
  const done = mockDoublePrevention.workflowSteps.filter((step) => step.status === "done").length;
  const closureRate = Math.round((done / mockDoublePrevention.workflowSteps.length) * 100);
  const closure = getClosureEfficiencyData();
  return (
    <CockpitPageFrame {...props} kicker="风险管控 / 隐患治理 / 闭环复盘" compactStatus="双控 mock 总览">
      <MetricRow
        metrics={[
          { label: "风险管控点", value: String(mockDoublePrevention.riskControls.length), unit: "处", hint: `重大 ${critical} / 较大 ${high}`, trend: "四色分级管控", risk: critical ? "critical" : "normal", icon: iconNode(ShieldAlert), tone: "red", status: "管控中" },
          { label: "管控措施", value: String(mockDoublePrevention.measures.length), unit: "条", hint: "按风险类型与岗位执行", trend: "班检/巡检/专项复核", risk: "normal", icon: iconNode(ShieldCheck), tone: "amber", status: "执行中" },
          { label: "隐患数量", value: String(mockDoublePrevention.hazards.length), unit: "项", hint: "隐患台账摘要，含逾期", trend: `逾期 ${mockDoublePrevention.overdueItems.length} 项`, risk: "high", icon: iconNode(ClipboardCheck), tone: "cyan", status: "整改中" },
          { label: "闭环完成率", value: String(closureRate), unit: "%", hint: "整理到销号八步闭环", trend: "复盘独立，不写入八步", risk: "low", icon: iconNode(RefreshCw), tone: "green", status: "推进中" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="风险分级与重点区域" badge="四色摘要" tone="warning" moreHref="/double-prevention/risk-control">
              <DenseList
                items={mockDoublePrevention.riskMap.map((item) => ({
                  label: item.regionName,
                  value: riskLabel[item.riskLevel],
                  meta: item.riskPoint,
                  risk: item.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="管控措施执行" badge={`${mockDoublePrevention.measures.length} 条`} tone="info">
              <DenseList
                items={mockDoublePrevention.measures.map((measure) => ({
                  label: measure.category,
                  value: measure.executionFrequency,
                  meta: `${measure.role} / ${measure.checklist}`,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="风险矩阵 / 四色态势 / 八步闭环"
            description="中心主视觉突出双控判断：风险等级在哪里、闭环推进到哪一步。"
            modeLabel="双控模式"
            modes={["总览", "风险管控", "隐患治理", "闭环复盘"]}
            activeMode="总览"
            legend={[
              { label: "已完成", value: String(closure[0].value), tone: "success" },
              { label: "进行中", value: String(closure[1].value), tone: "warning" },
              { label: "待开始", value: String(closure[2].value), tone: "neutral" },
            ]}
          >
            <DoubleControlVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="隐患治理状态" badge={`${mockDoublePrevention.hazards.length} 项`} tone="warning" moreHref="/double-prevention/hazard-governance">
              <DenseList
                items={mockDoublePrevention.hazards.map((item) => ({
                  label: item.description,
                  value: item.currentStep,
                  meta: `${item.owner} / ${item.deadline} / 逾期 ${item.overdueDays} 天 / ${handlingLabel[item.status] ?? item.status}`,
                  risk: item.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="逾期事项" badge={`${mockDoublePrevention.overdueItems.length} 项`} tone="danger">
              <DenseList
                items={mockDoublePrevention.overdueItems.map((item) => ({
                  label: item.hazardId,
                  value: `${item.overdueDays} 天`,
                  meta: `${item.owner} / ${item.escalationLevel}`,
                  tone: "danger",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="闭环效率" badge={`${closureRate}%`} tone="success">
              <DenseList
                items={closure.map((item) => ({
                  label: item.name,
                  value: `${item.value} 项`,
                  meta: "整理、分析、通报、整改、反馈、验收、审查、销号",
                  tone: item.name.includes("完成") ? "success" : item.name.includes("进行") ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "风险管控", href: "/double-prevention/risk-control", description: "风险清单与措施", status: "管控", icon: iconNode(ShieldCheck) },
          { label: "隐患治理", href: "/double-prevention/hazard-governance", description: "台账与逾期", status: "治理", icon: iconNode(ClipboardCheck) },
          { label: "闭环复盘", href: "/double-prevention/review", description: "独立复盘追溯", status: "复盘", icon: iconNode(RefreshCw) },
          { label: "双控配置", href: "/double-prevention/config", description: "规则与流程配置", status: "配置", icon: iconNode(Settings) },
        ]}
      />
      <BoundaryNote>mock 边界：双控配置只作为按钮或底部入口；复盘保持独立，不写入八步闭环；不触发真实整改或升级通知。</BoundaryNote>
    </CockpitPageFrame>
  );
}

export function Stage4CoreShowcasePage(props: Stage4CoreShowcasePageProps) {
  switch (props.content.path) {
    case "/dashboard":
      return <DashboardStage4 {...props} />;
    case "/monitoring":
      return <MonitoringStage4 {...props} />;
    case "/double-prevention":
      return <DoublePreventionStage4 {...props} />;
    default:
      return null;
  }
}
