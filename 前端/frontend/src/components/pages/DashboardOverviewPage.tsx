"use client";

import { Activity, BrainCircuit, Database, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CockpitBottomTicker, CockpitMetricCard, CockpitPageFrame, CockpitSectionPanel } from "@/components/cockpit";
import { DataTableShell } from "@/components/ui/BusinessSections";
import { TwinTunnelViewer } from "@/components/twin/TwinTunnelViewer";
import { businessPageByPath } from "@/data/businessPages";
import { mockDataModel } from "@/data/mockDataModel";
import { mockDoublePrevention } from "@/data/mockDoublePrevention";
import { mockKnowledge } from "@/data/mockKnowledge";
import { twinSensorPoints } from "@/data/twinTunnelScene";
import {
  fetchOutburstHealth,
  fetchOutburstSeries,
  fetchOutburstStats,
  fetchOutburstWarnings,
  type OutburstHealth,
  type OutburstSeriesPoint,
  type OutburstStats,
  type OutburstWarning,
} from "@/lib/outburstApi";
import { routeMetaByPath } from "@/config/routeMeta";
import type { CockpitMetricView } from "@/types/cockpit";
import type { RiskLevel, StatusTone } from "@/types/risk";

type KnowledgeStats = {
  total_indicators?: number;
  total_rules?: number;
  total_measures?: number;
  total_cases?: number;
  total_standards?: number;
};

type DashboardSnapshot = {
  outburstChecked: boolean;
  outburstOnline: boolean;
  knowledgeOnline: boolean;
  health?: OutburstHealth;
  stats?: OutburstStats;
  warnings: OutburstWarning[];
  series: OutburstSeriesPoint[];
  knowledge?: KnowledgeStats;
};

function iconNode(Icon: typeof Activity) {
  return <Icon className="h-4 w-4" aria-hidden />;
}

function value(input: unknown, fallback = "-") {
  if (input === undefined || input === null || input === "") return fallback;
  if (typeof input === "number") return input.toLocaleString();
  return String(input);
}

function useDashboardSnapshot() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    outburstChecked: false,
    outburstOnline: false,
    knowledgeOnline: false,
    warnings: [],
    series: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [outburst, knowledge] = await Promise.allSettled([
        Promise.allSettled([
          fetchOutburstHealth(),
          fetchOutburstStats(),
          fetchOutburstWarnings(24),
        ]),
        fetch("/api/knowledge/stats", { cache: "no-store" }).then((resp) => {
          if (!resp.ok) throw new Error(`knowledge ${resp.status}`);
          return resp.json() as Promise<KnowledgeStats>;
        }),
      ]);

      if (cancelled) return;
      const next: DashboardSnapshot = {
        outburstChecked: true,
        outburstOnline: false,
        knowledgeOnline: knowledge.status === "fulfilled",
        warnings: [],
        series: [],
      };
      if (outburst.status === "fulfilled") {
        const [health, stats, warnings] = outburst.value;
        if (health.status === "fulfilled") next.health = health.value;
        if (stats.status === "fulfilled") next.stats = stats.value;
        if (warnings.status === "fulfilled") next.warnings = warnings.value;
        next.outburstOnline = Boolean(next.health || next.stats || next.warnings.length);
      }
      if (knowledge.status === "fulfilled") {
        next.knowledge = knowledge.value;
      }
      setSnapshot(next);

      fetchOutburstSeries(undefined, 40)
        .then((series) => {
          if (!cancelled) setSnapshot((current) => ({ ...current, series }));
        })
        .catch(() => undefined);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}

function MiniTrend({ series }: { series: OutburstSeriesPoint[] }) {
  const points = series.slice().reverse().slice(-26);
  const values = points.map((item) => item.avg_value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const polyline = points
    .map((point, index) => {
      const x = 12 + index * (276 / Math.max(points.length - 1, 1));
      const y = 112 - ((point.avg_value - min) / Math.max(max - min, 1)) * 82;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 300 130" className="h-32 w-full" role="img" aria-label="近期预警监测曲线">
      <g stroke="rgba(125,211,252,0.14)" strokeWidth="1">
        {[28, 56, 84, 112].map((y) => <line key={y} x1="10" x2="290" y1={y} y2={y} />)}
      </g>
      {points.length ? <polyline points={polyline} fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}
      <circle cx="286" cy={points.length ? Number(polyline.split(" ").at(-1)?.split(",")[1] ?? 96) : 96} r="4" fill="#f59e0b" />
    </svg>
  );
}

function ContributionChart({ warning }: { warning?: OutburstWarning }) {
  const rows = warning?.sensor_contribution?.slice(0, 6) ?? [];
  const max = Math.max(...rows.map((item) => item.contribution), 0.0001);
  return (
    <div className="grid gap-2">
      {rows.length ? rows.map((item) => (
        <div key={item.sensor_id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4rem] items-center gap-2 text-xs">
          <span className="truncate font-semibold text-ink">{item.sensor_id}</span>
          <span className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
            <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(6, (item.contribution / max) * 100)}%` }} />
          </span>
          <span className="text-right text-primary">{item.contribution.toFixed(4)}</span>
        </div>
      )) : <p className="text-sm text-muted">等待事件贡献度。</p>}
    </div>
  );
}

function ModuleCard({
  title,
  href,
  badge,
  tone,
  children,
}: {
  title: string;
  href: string;
  badge: string;
  tone: StatusTone;
  children: React.ReactNode;
}) {
  return (
    <CockpitSectionPanel title={title} badge={badge} tone={tone} moreHref={href} contentClassName="min-h-[170px]">
      {children}
    </CockpitSectionPanel>
  );
}

export function DashboardOverviewPage() {
  const meta = routeMetaByPath["/dashboard"];
  const content = businessPageByPath["/dashboard"];
  const snapshot = useDashboardSnapshot();
  const latestWarning = snapshot.warnings[0];
  const highWarnings = snapshot.warnings.filter((item) => item.risk_level_code === "high" || item.risk_level_code === "critical").length;
  const hazardActive = mockDoublePrevention.hazards.filter((item) => item.status === "handling" || item.status === "reviewing").length;

  const metrics = useMemo<CockpitMetricView[]>(() => [
    { label: "监测预警", value: snapshot.outburstOnline ? value(snapshot.stats?.warning_count ?? snapshot.warnings.length) : snapshot.outburstChecked ? "离线" : "接入中", unit: snapshot.outburstOnline ? "条" : undefined, hint: "事件台账", trend: latestWarning?.risk_level ?? (snapshot.outburstChecked ? "等待后端" : "读取中"), risk: latestWarning?.risk_level_code ?? "normal", tone: "cyan", icon: iconNode(Activity), status: "后端" },
    { label: "63 节点", value: value(snapshot.stats?.meta_count ?? 63), unit: "项", hint: "模型节点口径", trend: snapshot.stats?.latest_dynamic_data ?? "最新采样", risk: "low", tone: "green", icon: iconNode(Database), status: "数据" },
    { label: "双控闭环", value: String(hazardActive), unit: "项", hint: "治理/验收中", trend: `${mockDoublePrevention.overdueItems.length} 项逾期`, risk: mockDoublePrevention.overdueItems.length ? "high" : "normal", tone: "amber", icon: iconNode(ShieldAlert), status: "mock" },
    { label: "知识智能", value: value(snapshot.knowledge?.total_indicators ?? mockKnowledge.standards.length), unit: snapshot.knowledgeOnline ? "项" : "条", hint: "规范/图谱/案例", trend: snapshot.knowledgeOnline ? "知识库在线" : "mock 摘要", risk: "low", tone: "blue", icon: iconNode(BrainCircuit), status: snapshot.knowledgeOnline ? "后端" : "mock" },
  ], [hazardActive, latestWarning, snapshot]);

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="六大业务态势总览" compactStatus="总览 / 非系统管理">
      <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <CockpitMetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)]">
        <CockpitSectionPanel title="数字孪生建模图" badge="3D GLB" tone="info" moreHref="/twin/tunnel" contentClassName="p-0">
          <TwinTunnelViewer variant="dashboard" />
        </CockpitSectionPanel>
        <div className="grid min-w-0 gap-3">
          <ModuleCard title="监测预警" href="/warning/events" badge={snapshot.outburstOnline ? "后端在线" : "fallback"} tone={snapshot.outburstOnline ? "info" : "warning"}>
            <MiniTrend series={snapshot.series} />
            <DataTableShell
              columns={[
                { key: "id", label: "事件" },
                { key: "risk", label: "等级" },
                { key: "time", label: "时间" },
              ]}
              rows={(snapshot.warnings.length ? snapshot.warnings : []).slice(0, 4).map((item) => ({ id: item.event_id, risk: item.risk_level, time: item.timestamp }))}
            />
          </ModuleCard>
          <ModuleCard title="溯源研判" href={latestWarning ? `/source-tracing/events/${latestWarning.event_id}` : "/source-tracing"} badge="Top 贡献" tone={highWarnings ? "warning" : "info"}>
            <ContributionChart warning={latestWarning} />
          </ModuleCard>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-4">
        <ModuleCard title="双重预防" href="/double-prevention" badge="mock" tone="warning">
          <div className="grid grid-cols-2 gap-2">
            {mockDoublePrevention.hazards.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[5px] border border-cyan-300/14 bg-[#03101f]/55 p-2">
                <p className="truncate text-xs text-muted">{item.currentStep}</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">{item.id}</p>
              </div>
            ))}
          </div>
        </ModuleCard>
        <ModuleCard title="数字孪生" href="/twin" badge={`${twinSensorPoints.length} 点`} tone="info">
          <DataTableShell
            columns={[
              { key: "name", label: "锚点" },
              { key: "status", label: "状态" },
              { key: "layer", label: "图层" },
            ]}
            rows={twinSensorPoints.slice(0, 5).map((item) => ({ name: item.shortLabel, status: item.status, layer: item.displayLayer }))}
          />
        </ModuleCard>
        <ModuleCard title="数据模型" href="/data" badge="63 节点" tone="info">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="动态样本" value={value(snapshot.stats?.dynamic_sensor_count, "后端")} />
            <Stat label="模型版本" value={mockDataModel.modelEvaluation.modelVersion} />
            <Stat label="质量评分" value={String(mockDataModel.datasetVersions[0]?.qualityScore ?? "-")} />
            <Stat label="配置" value={snapshot.outburstOnline ? "已接入" : "待连接"} />
          </div>
        </ModuleCard>
        <ModuleCard title="知识智能" href="/knowledge" badge={snapshot.knowledgeOnline ? "后端" : "mock"} tone="info">
          <div className="grid gap-2">
            {[
              ["规范", value(snapshot.knowledge?.total_standards ?? mockKnowledge.standards.length)],
              ["图谱", value(snapshot.knowledge?.total_indicators ?? mockKnowledge.causalGraph.length)],
              ["案例", value(snapshot.knowledge?.total_cases ?? 0)],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between rounded-[5px] border border-cyan-300/14 bg-[#03101f]/55 px-3 py-2 text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-semibold text-ink">{val}</span>
              </div>
            ))}
          </div>
        </ModuleCard>
      </div>

      <CockpitBottomTicker
        level={(latestWarning?.risk_level_code ?? "normal") as RiskLevel}
        summary={latestWarning?.summary ?? "综合驾驶舱聚合六大业务模块，系统管理不进入总览首屏。"}
        area={latestWarning ? `${latestWarning.event_id} / ${latestWarning.risk_level}` : "六大业务态势"}
        href={latestWarning ? `/warning/events/${latestWarning.event_id}` : "/warning/events"}
        updatedAt={snapshot.stats?.latest_warning ?? content.updatedAt}
        autoRefresh="后端数据层 / mock 边界"
      />
    </CockpitPageFrame>
  );
}

function Stat({ label, value: statValue }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-cyan-300/14 bg-[#03101f]/55 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{statValue}</p>
    </div>
  );
}
