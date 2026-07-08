"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { Activity, AlertTriangle, Database, Play, Server } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CockpitBottomTicker,
  CockpitHeroPanel,
  CockpitMetricCard,
  CockpitPageFrame,
  CockpitSectionPanel,
} from "@/components/cockpit";
import { OutburstClosureTemplatePanel } from "@/components/outburst/OutburstClosureTemplatePanel";
import { OutburstDisposalAdvicePanel } from "@/components/outburst/OutburstDisposalAdvicePanel";

import { OutburstRiskExplanationPanel } from "@/components/outburst/OutburstRiskExplanationPanel";
import { RiskGaugePanel } from "@/components/outburst/RiskGaugePanel";
import { OutburstSourceBoundaryPanel } from "@/components/outburst/OutburstSourceBoundaryPanel";
import { StaticDataPanel } from "@/components/outburst/StaticDataPanel";
import { DataTableShell, KeyValueList, TimelineList } from "@/components/ui/BusinessSections";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  OutburstApiError,
  fetchOutburstConfig,
  fetchOutburstEventsLedger,
  fetchOutburstHealth,
  fetchOutburstLatestWarning,
  fetchOutburstMeta,
  fetchOutburstRawData,
  fetchOutburstRecentData,
  fetchOutburstSensors,
  fetchOutburstSeries,
  fetchOutburstStaticData,
  fetchOutburstStats,
  fetchOutburstWarning,
  fetchOutburstWarningContribution,
  fetchOutburstWarnings,
  runOutburstBatchPredict,
  runOutburstPredict,
  runOutburstStaticRisk,
  type OutburstConfig,
  type OutburstHealth,
  type OutburstRawDataPoint,
  type OutburstSensorMeta,
  type OutburstSeriesPoint,
  type OutburstStaticData,
  type OutburstStats,
  type OutburstWarning,
  type OutburstWarningContribution,
} from "@/lib/outburstApi";
import {
  CHANNEL_POLICY_TEXT,
  DYNAMIC_CHANNEL_TOTAL,
  PHYSICS_CONSTRAINED_CHANNEL_COUNT,
  REAL_SENSOR_CHANNEL_COUNT,
  channelSourceLabel,
  formatObservedNodeCount,
  inferChannelSourceType,
} from "@/lib/outburstChannelPolicy";
import {
  classifyOutburstSource,
  getContributionExplanation,
  type OutburstSourceType,
} from "@/lib/outburstBusinessRules";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent, KeyValueItem, RecordValue } from "@/types/business";
import type { CockpitMetricView } from "@/types/cockpit";
import type { RouteMeta } from "@/types/navigation";
import type { RiskLevel, StatusTone } from "@/types/risk";
import type { ReactNode } from "react";

type OutburstIntegrationPageProps = {
  meta: RouteMeta;
  routePath: string;
  routeParams?: Record<string, string>;
  content?: BusinessPageContent;
};

type LoadState = "loading" | "ready" | "error";

type Snapshot = {
  health?: OutburstHealth;
  stats?: OutburstStats;
  sensors: OutburstSensorMeta[];
  meta: OutburstSensorMeta[];
  warnings: OutburstWarning[];
  latestWarning?: OutburstWarning;
  selectedWarning?: OutburstWarning;
  selectedContribution?: OutburstWarningContribution;
  ledger: OutburstWarning[];
  series: OutburstSeriesPoint[];
  recentData: OutburstRawDataPoint[];
  rawData: OutburstRawDataPoint[];
  staticData?: OutburstStaticData;
  configs: OutburstConfig[];
};

type EnrichedContribution = {
  sensor_id: string;
  contribution: number;
  rank: number;
  source_type?: string;
  slot?: string;
};

const riskText: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般",
  high: "较大",
  critical: "重大",
};

const statusText: Record<string, string> = {
  pending: "待确认",
  verifying: "复核中",
  handling: "处置中",
  reviewing: "验收中",
  closed: "已关闭",
};

const riskTone: Record<RiskLevel, StatusTone> = {
  low: "info",
  normal: "warning",
  high: "warning",
  critical: "danger",
};

function iconNode(Icon: typeof Activity) {
  return <Icon className="h-4 w-4" aria-hidden />;
}

function makeContent(routePath: string, content?: BusinessPageContent): BusinessPageContent {
  return content ?? {
    path: routePath,
    metrics: [],
    sections: [],
    statusNotes: ["预警模型相关页面通过 Next.js API 代理读取 alert warning FastAPI 后端。"],
    boundaryNotes: ["双控、区域、系统管理仍保留 mock；本页仅展示预警模型后端可提供的数据。"],
    dataSource: "static",
    updatedAt: "后端实时读取",
  };
}

function value(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : fallback;
  return String(value);
}

function riskCode(warning?: OutburstWarning): RiskLevel {
  return warning?.risk_level_code ?? "normal";
}

function tableRows<T>(rows: T[], mapper: (row: T, index: number) => Record<string, RecordValue>) {
  return rows.map(mapper);
}

function sectionTitle(path: string) {
  if (path.startsWith("/monitoring")) return "后端实测监测数据";
  if (path.startsWith("/warning")) return "完整事件台账";
  if (path.startsWith("/source-tracing")) return "模型贡献溯源";
  if (path.startsWith("/data")) return "后端数据资产";
  if (path.startsWith("/model")) return "模型推理与配置";
  if (path.startsWith("/twin")) return "节点热力与点位";
  return "预警模型总览";
}

function useOutburstSnapshot(routeParams?: Record<string, string>) {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    sensors: [],
    meta: [],
    warnings: [],
    ledger: [],
    series: [],
    recentData: [],
    rawData: [],
    configs: [],
  });
  const routeId = routeParams?.id;

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const [health, stats, sensors, meta, warnings, latestWarning, staticData, configs, recentData, rawData, ledgerBody] = await Promise.all([
        fetchOutburstHealth(),
        fetchOutburstStats(),
        fetchOutburstSensors(),
        fetchOutburstMeta(),
        fetchOutburstWarnings(120),
        fetchOutburstLatestWarning().catch(() => undefined),
        fetchOutburstStaticData().catch(() => undefined),
        fetchOutburstConfig().catch(() => []),
        fetchOutburstRecentData(80).catch(() => []),
        fetchOutburstRawData({ limit: 80, offset: 0 }).catch(() => []),
        fetchOutburstEventsLedger(120).catch(() => ({ events: [], count: 0 })),
      ]);
      const selectedId = routeId ?? latestWarning?.event_id ?? warnings[0]?.event_id;
      const selectedWarning = selectedId ? await fetchOutburstWarning(selectedId).catch(() => latestWarning ?? warnings[0]) : latestWarning ?? warnings[0];
      const selectedContribution = selectedWarning?.event_id ? await fetchOutburstWarningContribution(selectedWarning.event_id).catch(() => undefined) : undefined;
      const series = await fetchOutburstSeries(sensors[0]?.sensor_id).catch(() => []);
      setSnapshot({ health, stats, sensors, meta, warnings, latestWarning, selectedWarning, selectedContribution, ledger: ledgerBody.events, series, recentData, rawData, staticData, configs });
      setState("ready");
    } catch (err) {
      const text = err instanceof OutburstApiError ? err.message : err instanceof Error ? err.message : String(err);
      setMessage(text);
      setState("error");
    }
  }, [routeId]);

  useEffect(() => {
    // This component is a client-side data bridge for a local FastAPI service.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { state, message, snapshot, reload: load, setSnapshot };
}

function Metrics({ metrics }: { metrics: CockpitMetricView[] }) {
  return (
    <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <CockpitMetricCard key={`${metric.label}-${metric.value}`} metric={metric} />)}
    </div>
  );
}

function Split({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(240px,0.82fr)_minmax(0,1.7fr)_minmax(250px,0.9fr)]">
      <aside className="grid min-w-0 content-start gap-3">{left}</aside>
      <main className="min-w-0">{center}</main>
      <aside className="grid min-w-0 content-start gap-3">{right}</aside>
    </div>
  );
}

function ServiceState({ state, message, onRetry }: { state: LoadState; message: string; onRetry: () => void }) {
  if (state === "ready") return null;
  return (
    <CockpitSectionPanel title={state === "loading" ? "正在读取预警后端" : "预警后端不可用"} badge={state === "loading" ? "loading" : "503"} tone={state === "loading" ? "info" : "danger"}>
      {state === "loading" ? (
        <p className="text-sm leading-6 text-muted">正在通过 `/api/outburst/*` 读取 FastAPI、SQLite、动态通道元数据和事件台账。</p>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm leading-6 text-muted">{cleanDisplayCopy(message)}</p>
          <button type="button" onClick={onRetry} className="h-9 rounded-[5px] border border-cyan-300/24 bg-cyan-300/10 px-3 text-xs font-semibold text-primary hover:border-cyan-300/60">
            重试连接
          </button>
        </div>
      )}
    </CockpitSectionPanel>
  );
}

const SYSTEM_COLORS: Record<string, { stroke: string; label: string }> = {
  gas: { stroke: "#ef4444", label: "瓦斯监测" },
  stress: { stroke: "#f59e0b", label: "应力监测" },
  environment: { stroke: "#22c55e", label: "环境监测" },
  acoustic: { stroke: "#3b82f6", label: "声学监测" },
};

function classifySensorSystem(indicator_name?: string): string {
  if (!indicator_name) return "acoustic";
  const name = indicator_name.toLowerCase();
  
  const gasKeywords = ["甲烷", "瓦斯浓度变化率", "瓦斯涌出量波动系数"];
  if (gasKeywords.some(k => name.includes(k))) return "gas";
  
  const stressKeywords = ["钻屑量", "巷道围岩变形量", "煤层原始瓦斯压力", "煤层瓦斯压力波动趋势", "钻孔瓦斯涌出初速度", "钻屑瓦斯解吸指标", "k₁", "q"];
  if (stressKeywords.some(k => name.includes(k))) return "stress";
  
  const environmentKeywords = ["一氧化碳", "二氧化碳", "温度", "风速", "氧气", "压力", "粉尘", "风向", "流量", "煤体内部温度变化"];
  if (environmentKeywords.some(k => name.includes(k))) return "environment";
  
  const acousticKeywords = ["电磁辐射", "声发射", "微震", "b值"];
  if (acousticKeywords.some(k => name.includes(k))) return "acoustic";
  
  return "acoustic";
}

function MultiSystemTrend({ warnings }: { warnings: OutburstWarning[] }) {
  const riskData = [...warnings].filter(w => w.combined_risk !== undefined).slice(-40);
  if (riskData.length === 0) {
    return <EmptyState title="暂无风险数据" description="等待后端返回预警风险数据。" />;
  }

  const allValues = riskData.flatMap(w => [w.combined_risk, w.dynamic_risk ?? 0, w.static_risk ?? 0]).filter(v => v !== undefined);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal;
  const padding = Math.max(range * 0.3, 0.05);
  const yMin = Math.max(0, minVal - padding);
  const yMax = Math.min(1, maxVal + padding);
  const yRange = yMax - yMin || 0.01;

  const scaleX = (index: number) => 30 + index * (620 / Math.max(1, riskData.length - 1));
  const scaleY = (v: number, offset: number = 0) => 230 - ((v - yMin) / yRange) * 170 + offset;

  const offsetStatic = -20;
  const offsetDynamic = 20;
  const offsetCombined = 0;

  const combinedLine = riskData.map((w, i) => `${scaleX(i)},${scaleY(w.combined_risk, offsetCombined)}`).join(" ");
  const dynamicLine = riskData.map((w, i) => `${scaleX(i)},${scaleY(w.dynamic_risk ?? 0, offsetDynamic)}`).join(" ");
  const staticLine = riskData.map((w, i) => `${scaleX(i)},${scaleY(w.static_risk ?? 0, offsetStatic)}`).join(" ");

  const lastData = riskData[riskData.length - 1];

  return (
    <div className="relative min-h-[310px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/76 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-xs text-muted">综合风险</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: "#22d3ee" }} />
          <span className="text-xs text-muted">动态风险</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: "#a78bfa" }} />
          <span className="text-xs text-muted">静态风险</span>
        </div>
      </div>
      <svg viewBox="0 0 690 270" className="h-[270px] w-full" role="img" aria-label="综合风险概率变化曲线">
        <rect x="24" y="34" width="642" height="210" rx="8" fill="rgba(14,165,233,0.04)" stroke="rgba(56,189,248,0.18)" />
        <g stroke="rgba(125,211,252,0.12)" strokeWidth="1">
          {Array.from({ length: 5 }, (_, i) => 34 + i * (170 / 4)).map((y) => <line key={y} x1="30" x2="650" y1={y} y2={y} />)}
        </g>
        <text x="655" y="40" fill="#7dd3fc" fontSize="9">{yMax.toFixed(2)}</text>
        <text x="655" y="82" fill="#7dd3fc" fontSize="9">{((yMax + yMin * 3) / 4).toFixed(2)}</text>
        <text x="655" y="124" fill="#7dd3fc" fontSize="9">{((yMax + yMin) / 2).toFixed(2)}</text>
        <text x="655" y="166" fill="#7dd3fc" fontSize="9">{((yMax * 3 + yMin) / 4).toFixed(2)}</text>
        <text x="655" y="208" fill="#7dd3fc" fontSize="9">{yMin.toFixed(2)}</text>
        <polyline points={staticLine} fill="none" stroke="#a78bfa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.7" />
        <polyline points={dynamicLine} fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.8" />
        <polyline points={combinedLine} fill="none" stroke="#f59e0b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <g>
          <circle cx={scaleX(riskData.length - 1)} cy={scaleY(lastData.combined_risk, offsetCombined)} r="6" fill="#f59e0b" />
          <circle cx={scaleX(riskData.length - 1)} cy={scaleY(lastData.dynamic_risk ?? 0, offsetDynamic)} r="5" fill="#22d3ee" />
          <circle cx={scaleX(riskData.length - 1)} cy={scaleY(lastData.static_risk ?? 0, offsetStatic)} r="5" fill="#a78bfa" />
          <text x="460" y="55" fill="#fcd34d" fontSize="14" fontWeight="bold">综合风险: {lastData.combined_risk.toFixed(3)}</text>
          <text x="460" y="75" fill="#7dd3fc" fontSize="11">动态: {lastData.dynamic_risk?.toFixed(3) ?? "-"} | 静态: {lastData.static_risk?.toFixed(3) ?? "-"}</text>
          <text x="460" y="92" fill="#bfdbfe" fontSize="11">等级: {riskText[lastData.risk_level_code ?? "low"]}</text>
        </g>
        {Array.from({ length: 6 }, (_, i) => {
          const index = Math.round(i * (riskData.length - 1) / 5);
          const timeAgo = (riskData.length - 1 - index) * 2;
          return (
            <g key={i}>
              <line x1={scaleX(index)} y1="204" x2={scaleX(index)} y2="212" stroke="rgba(125,211,252,0.3)" strokeWidth="1" />
              <text x={scaleX(index)} y="225" textAnchor="middle" fill="#7dd3fc" fontSize="8">
                {timeAgo === 0 ? "现在" : `${timeAgo}s前`}
              </text>
            </g>
          );
        })}
        <text x="30" y="245" fill="#7dd3fc" fontSize="9">时间轴</text>
        <text x="30" y="260" fill="#7dd3fc" fontSize="11">风险概率实时变化 / 四色分级：蓝(低)、黄(一般)、橙(较大)、红(重大) | 曲线垂直偏移便于区分</text>
      </svg>
    </div>
  );
}

function ContributionBars({ rows: sourceRows }: { rows: Array<{ sensor_id: string; contribution: number; rank: number }> }) {
  const rows = sourceRows.slice(0, 12);
  const max = Math.max(...rows.map((row) => row.contribution), 0.0001);
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.sensor_id} className="rounded-[5px] border border-cyan-300/14 bg-[#03101f]/50 px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ink">#{row.rank} {row.sensor_id}</span>
            <span className="text-primary">{row.contribution.toFixed(6)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
            <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(4, (row.contribution / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function latestRows(sensors: OutburstSensorMeta[]) {
  return tableRows(sensors.slice(0, DYNAMIC_CHANNEL_TOTAL), (sensor) => ({
    id: sensor.sensor_id,
    name: sensor.indicator_name ?? sensor.sensor_id,
    type: sensor.sensor_type ?? sensor.indicator_type ?? "-",
    source: channelSourceLabel(inferChannelSourceType(sensor.sensor_id, sensor.source_type ?? sensor.indicator_type)),
    position: sensor.spatial_position ?? "-",
    value: sensor.value ?? null,
    unit: sensor.unit ?? "-",
    timestamp: sensor.timestamp ?? "-",
  }));
}

function warningRows(warnings: OutburstWarning[]) {
  return tableRows(warnings, (warning) => ({
    id: warning.event_id,
    risk: warning.risk_level,
    combined: warning.combined_risk.toFixed(3),
    dynamic: warning.dynamic_risk.toFixed(3),
    static: warning.static_risk.toFixed(3),
    status: statusText[warning.event_status ?? "pending"] ?? warning.event_status ?? "-",
    owner: warning.owner ?? "-",
    time: warning.timestamp,
  }));
}

function metaRows(meta: OutburstSensorMeta[]) {
  return tableRows(meta, (item) => ({
    id: item.sensor_id,
    name: item.indicator_name ?? "-",
    type: item.indicator_type ?? "-",
    source: channelSourceLabel(inferChannelSourceType(item.sensor_id, item.source_type ?? item.indicator_type)),
    position: item.spatial_position ?? "-",
    unit: item.unit ?? "-",
    description: item.description ?? "-",
  }));
}

function rawRows(rows: OutburstRawDataPoint[]) {
  return tableRows(rows.slice(0, 80), (item, index) => ({
    id: item.id ?? index + 1,
    sensor: item.sensor_id ?? "-",
    type: item.sensor_type ?? "-",
    source: channelSourceLabel(inferChannelSourceType(item.sensor_id, item.source_type)),
    value: item.value ?? null,
    unit: item.unit ?? "-",
    time: item.timestamp ?? "-",
  }));
}

function staticItems(staticData?: OutburstStaticData): KeyValueItem[] {
  if (!staticData) return [];
  return Object.entries(staticData).slice(0, 40).map(([label, raw]) => ({ label, value: raw as RecordValue }));
}

function configRows(configs: OutburstConfig[]) {
  return tableRows(configs, (item) => ({
    key: item.config_key,
    value: maskConfigValue(item.config_key, item.config_value),
    description: item.description ?? "-",
    updatedAt: item.updated_at ?? "-",
  }));
}

function enrichContributions(
  rows: Array<{ sensor_id: string; contribution: number; rank: number }>,
  meta: OutburstSensorMeta[],
): EnrichedContribution[] {
  return rows.map((row) => {
    const metaItem = meta.find((item) => item.sensor_id === row.sensor_id);
    return {
      ...row,
      source_type: metaItem?.source_type ?? metaItem?.indicator_type,
      slot: metaItem?.sensor_id,
    };
  });
}

function primarySourceType(rows: EnrichedContribution[], staticRoute: boolean): OutburstSourceType {
  if (staticRoute) return "static_prior";
  const first = rows[0];
  if (!first) return "backend_reported";
  return classifyOutburstSource({ sensorId: first.sensor_id, sourceType: first.source_type, slot: first.slot });
}

function contributionDetailRows(rows: EnrichedContribution[], meta: OutburstSensorMeta[]) {
  return rows.map((item) => {
    const explanation = getContributionExplanation(item);
    const metaItem = meta.find((metaRow) => metaRow.sensor_id === item.sensor_id);
    const systemKey = classifySensorSystem(metaItem?.indicator_name);
    const systemLabels: Record<string, string> = {
      gas: "瓦斯监测",
      stress: "应力监测",
      environment: "环境监测",
      acoustic: "声学监测",
    };
    return {
      rank: item.rank,
      sensor: item.sensor_id,
      indicator: metaItem?.indicator_name ?? item.sensor_id,
      system: systemLabels[systemKey] ?? systemKey,
      contribution: item.contribution.toFixed(6),
      position: metaItem?.spatial_position ?? "-",
    };
  });
}

function eventStageItems(warning?: OutburstWarning) {
  if (!warning) return [];
  const status = warning.event_status ?? "pending";
  const records = warning.disposal_records ?? [];
  if (records.length > 0) return records;
  return [
    {
      time: warning.timestamp || "待确认",
      title: "触发",
      description: warning.summary ?? "后端返回预警事件，等待复核。",
      tone: "info" as const,
    },
    {
      time: status === "pending" ? "未完成" : "后端状态",
      title: "确认",
      description: status === "pending" ? "后端未返回确认记录，前端保守展示为待确认。" : `当前状态：${statusText[status] ?? status}`,
      tone: status === "pending" ? "warning" as const : "neutral" as const,
    },
    {
      time: "待记录",
      title: "处置",
      description: "后端未返回处置阶段记录，前端不编造完成状态。",
      tone: "neutral" as const,
    },
    {
      time: "待记录",
      title: "复核",
      description: "等待现场复核、验收或关闭材料。",
      tone: "neutral" as const,
    },
    {
      time: status === "closed" ? "已关闭" : "未关闭",
      title: "关闭",
      description: status === "closed" ? "后端状态显示已关闭。" : "未收到关闭记录。",
      tone: status === "closed" ? "success" as const : "neutral" as const,
    },
  ];
}

function resultItems(result: Record<string, unknown> | null): KeyValueItem[] {
  if (!result) return [];
  return Object.entries(result).slice(0, 8).map(([label, raw]) => ({
    label,
    value: typeof raw === "object" && raw !== null ? JSON.stringify(raw) : raw as RecordValue,
  }));
}

function maskConfigValue(key: string, raw: string) {
  const sensitive = /secret|token|password|passwd|key|path|weight|connection|dsn|url/i.test(key);
  if (!sensitive) return raw;
  if (!raw) return "-";
  return raw.length <= 4 ? "****" : `${raw.slice(0, 2)}****${raw.slice(-2)}`;
}

export function OutburstIntegrationPage({ meta, routePath, routeParams, content }: OutburstIntegrationPageProps) {
  const framedContent = makeContent(routePath, content);
  const { state, message, snapshot, reload, setSnapshot } = useOutburstSnapshot(routeParams);
  const [predicting, setPredicting] = useState(false);
  const [staticRiskResult, setStaticRiskResult] = useState<Record<string, unknown> | null>(null);
  const [batchResult, setBatchResult] = useState<Record<string, unknown> | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const selectedWarning = snapshot.selectedWarning ?? snapshot.warnings[0];
  const contributionRows = enrichContributions(snapshot.selectedContribution?.sensor_contribution ?? selectedWarning?.sensor_contribution ?? [], snapshot.meta);
  const sourceType = primarySourceType(contributionRows, routePath.endsWith("/static"));
  const highRisk = snapshot.warnings.filter((item) => item.risk_level_code === "high" || item.risk_level_code === "critical").length;
  const latestSensor = snapshot.sensors[0];
  const observedNodeCount = snapshot.stats?.meta_count ?? (snapshot.meta.length || snapshot.sensors.length || undefined);
  const policyHint = formatObservedNodeCount(observedNodeCount);

  const metrics = useMemo<CockpitMetricView[]>(() => [
    { label: "后端状态", value: snapshot.health?.status ?? (state === "ready" ? "ready" : "pending"), hint: "FastAPI / SQLite 连接", trend: snapshot.health?.database ?? message, risk: snapshot.health?.status === "healthy" ? "low" : "normal", icon: iconNode(Server), tone: "cyan", status: "代理" },
    { label: "实测节点", value: value(observedNodeCount), unit: "个", hint: "meta_info / sensors/latest", trend: `模型字典 ${DYNAMIC_CHANNEL_TOTAL} 维`, icon: iconNode(Database), tone: "green", status: "动态" },
    { label: "动态样本", value: value(snapshot.stats?.dynamic_sensor_count), unit: "行", hint: "dynamic_sensor_data", trend: snapshot.stats?.latest_dynamic_data ?? "等待连接", icon: iconNode(Activity), tone: "blue", status: "SQLite" },
    { label: "事件台账", value: value(snapshot.stats?.warning_count ?? (snapshot.ledger.length || snapshot.warnings.length)), unit: "条", hint: "warning_results + 台账字段", trend: snapshot.latestWarning?.timestamp ?? (highRisk ? `${highRisk} 条较大及以上` : "暂无高风险"), icon: iconNode(AlertTriangle), tone: "red", status: "台账" },
  ], [highRisk, message, observedNodeCount, snapshot, state]);

  const handlePredict = async () => {
    setPredicting(true);
    try {
      await runOutburstPredict();
      const [stats, warnings] = await Promise.all([fetchOutburstStats(), fetchOutburstWarnings(120)]);
      const selected = warnings[0] ? await fetchOutburstWarning(warnings[0].event_id).catch(() => warnings[0]) : undefined;
      setSnapshot((current) => ({ ...current, stats, warnings, selectedWarning: selected }));
    } finally {
      setPredicting(false);
    }
  };

  const handleStaticRisk = async () => {
    const result = await runOutburstStaticRisk({ dry_run: true, source: "frontend_manual_trial" });
    setStaticRiskResult(result);
  };

  const handleBatchDryRun = async () => {
    const result = await runOutburstBatchPredict({ limit: 20, source: "frontend_manual_dry_run" });
    setBatchResult(result);
  };

  const isWarningPage = routePath.startsWith("/warning");
  const isTracingPage = routePath.startsWith("/source-tracing");
  const isDataPage = routePath.startsWith("/data");
  const isModelPage = routePath.startsWith("/model");
  const isSystemConfigPage = routePath === "/system/config";
  const isTwinPage = routePath.startsWith("/twin");

  return (
    <CockpitPageFrame meta={meta} content={framedContent} kicker="alert warning FastAPI / 63维动态通道 / Next.js代理">
      <ServiceState state={state} message={message} onRetry={reload} />
      <Metrics metrics={metrics} />

      <Split
        left={(
          <>
            {!(isWarningPage || isTracingPage) && (
              <>
                <RiskGaugePanel warning={selectedWarning} />
                <div className="grid gap-3">
                  <MultiSystemTrend warnings={snapshot.warnings} />
                </div>
                {Object.entries(SYSTEM_COLORS).map(([system, config]) => {
                  const systemSensors = snapshot.sensors.filter((s) => classifySensorSystem(s.indicator_name) === system);
                  return (
                    <CockpitSectionPanel key={system} title={config.label} badge={`${systemSensors.length}个`} tone="info">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-cyan-300/16">
                              <th className="px-2 py-1.5 font-semibold text-cyan-100/72">编号-监测指标</th>
                              <th className="px-2 py-1.5 font-semibold text-cyan-100/72">布设位置</th>
                              <th className="px-2 py-1.5 font-semibold text-cyan-100/72">实时值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {systemSensors.map((s) => (
                              <tr key={s.sensor_id} className="border-b border-cyan-300/10">
                                <td className="px-2 py-1.5">
                                  <div className="font-medium text-ink">{s.sensor_id}</div>
                                  <div className="text-[10px] text-muted">{s.indicator_name ?? "-"}</div>
                                </td>
                                <td className="px-2 py-1.5 text-muted">{s.spatial_position ?? "-"}</td>
                                <td className="px-2 py-1.5 font-mono text-primary">{s.value ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CockpitSectionPanel>
                  );
                })}
              </>
            )}
            {!(isWarningPage || isTracingPage) && (
              <CockpitSectionPanel title="最新事件" badge={selectedWarning?.event_id ?? "none"} tone={selectedWarning ? riskTone[riskCode(selectedWarning)] : "neutral"}>
                {selectedWarning ? (
                  <KeyValueList items={[
                    { label: "事件编号", value: selectedWarning.event_id },
                    { label: "风险等级", value: selectedWarning.risk_level },
                    { label: "综合风险", value: selectedWarning.combined_risk.toFixed(3) },
                    { label: "状态", value: statusText[selectedWarning.event_status ?? "pending"] ?? "-" },
                  ]} />
                ) : <EmptyState title="暂无事件" description="后端 warning_results 暂无台账记录。" />}
              </CockpitSectionPanel>
            )}
          </>
        )}
        center={null}
        right={(
          <>
            {!(isWarningPage || isTracingPage) && (
              <StaticDataPanel />
            )}
            {!(isWarningPage || isTracingPage) && (
              <CockpitSectionPanel title="显式模型推理" badge={predicting ? "running" : "manual"} tone="warning">
                <div className="grid gap-3">
                  <p className="text-xs leading-5 text-muted">点击后调用 `POST /api/outburst/predict`，后端会运行模型并写入 `warning_results` 事件台账。</p>
                  <button
                    type="button"
                    data-testid="outburst-predict-button"
                    onClick={handlePredict}
                    disabled={predicting || state !== "ready"}
                    className="flex h-10 items-center justify-center gap-2 rounded-[5px] border border-orange-300/28 bg-orange-400/12 px-3 text-xs font-semibold text-orange-100 transition hover:border-orange-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" aria-hidden />
                    {predicting ? "推理写入中" : "运行一次预警推理"}
                  </button>
                </div>
              </CockpitSectionPanel>
            )}
            {routePath.endsWith("/static") ? (
              <CockpitSectionPanel title="静态风险试算" badge="manual" tone="warning">
                <div className="grid gap-3">
                  <p className="text-xs leading-5 text-muted">调用 `POST /api/outburst/static-risk`，仅做前端手动试算，不写正式事件。</p>
                  <button type="button" onClick={handleStaticRisk} disabled={state !== "ready"} className="h-9 rounded-[5px] border border-orange-300/28 bg-orange-400/12 px-3 text-xs font-semibold text-orange-100 disabled:cursor-not-allowed disabled:opacity-50">
                    运行静态试算
                  </button>
                  {staticRiskResult ? <p className="text-xs leading-5 text-muted">已返回试算结果，可在网络响应中核查；本页不写入事件台账。</p> : null}
                  {staticRiskResult ? <KeyValueList items={resultItems(staticRiskResult)} /> : null}
                </div>
              </CockpitSectionPanel>
            ) : null}
            {routePath.endsWith("/evaluation") ? (
              <CockpitSectionPanel title="批量推理 dry-run" badge="dry_run=true" tone="info">
                <div className="grid gap-3">
                  <p className="text-xs leading-5 text-muted">调用 `POST /api/outburst/predict-batch`，默认 dry_run=true，不写库。</p>
                  <button type="button" onClick={handleBatchDryRun} disabled={state !== "ready"} className="h-9 rounded-[5px] border border-cyan-300/24 bg-cyan-300/10 px-3 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50">
                    运行 dry-run
                  </button>
                  {batchResult ? <p className="text-xs leading-5 text-muted">dry-run 已返回，保持不写正式台账。</p> : null}
                  {batchResult ? <KeyValueList items={resultItems(batchResult)} /> : null}
                </div>
              </CockpitSectionPanel>
            ) : null}
          </>
        )}
      />

      {isWarningPage && !routeParams?.id && !routePath.includes("[id]") ? (
        <CockpitSectionPanel title="预警事件列表" badge={`${snapshot.warnings.length}条`} tone="info">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="搜索事件编号、空间位置..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-9 w-full rounded-[5px] border border-cyan-300/24 bg-cyan-300/10 px-3 text-xs text-ink placeholder:text-muted focus:border-cyan-300/60 focus:outline-none md:w-64"
            />
            <select
              value={riskLevelFilter}
              onChange={(e) => setRiskLevelFilter(e.target.value)}
              className="h-9 min-w-0 rounded-control border border-line bg-card px-3 text-xs text-ink outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">全部风险等级</option>
              <option value="low">低风险</option>
              <option value="normal">一般风险</option>
              <option value="high">较大风险</option>
              <option value="critical">重大风险</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 min-w-0 rounded-control border border-line bg-card px-3 text-xs text-ink outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">全部状态</option>
              <option value="pending">待确认</option>
              <option value="verifying">复核中</option>
              <option value="handling">处置中</option>
              <option value="reviewing">验收中</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cyan-300/16">
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">事件编号</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">风险等级</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">事件时间</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">空间位置</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">关联通道</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">处置状态</th>
                  <th className="px-3 py-2 font-semibold text-cyan-100/72">负责人</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.warnings
                  .filter((w) => {
                    const matchKeyword = !searchKeyword || 
                      w.event_id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      w.mine_id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      w.sensor_contribution?.some((sc) => {
                        const sensor = snapshot.sensors.find((s) => s.sensor_id === sc.sensor_id);
                        return sensor?.spatial_position?.toLowerCase().includes(searchKeyword.toLowerCase());
                      });
                    const matchRiskLevel = riskLevelFilter === "all" || w.risk_level_code === riskLevelFilter;
                    const matchStatus = statusFilter === "all" || w.event_status === statusFilter;
                    return matchKeyword && matchRiskLevel && matchStatus;
                  })
                  .map((w) => (
                    <tr 
                      key={w.event_id} 
                      className={`border-b border-cyan-300/10 cursor-pointer transition hover:bg-cyan-300/8 ${selectedWarning?.event_id === w.event_id ? "bg-cyan-300/10" : ""}`}
                      onClick={() => {
                        fetchOutburstWarning(w.event_id).then((selected) => {
                          setSnapshot((current) => ({ ...current, selectedWarning: selected }));
                        });
                      }}
                    >
                      <td className="px-3 py-2 font-medium text-primary">{w.event_id}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          w.risk_level_code === "critical" ? "bg-red-500/20 text-red-100" :
                          w.risk_level_code === "high" ? "bg-orange-500/20 text-orange-100" :
                          w.risk_level_code === "normal" ? "bg-yellow-500/20 text-yellow-100" :
                          "bg-blue-500/20 text-blue-100"
                        }`}>
                          {w.risk_level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">{w.timestamp}</td>
                      <td className="px-3 py-2">
                        {w.sensor_contribution?.slice(0, 3).map((sc) => {
                          const sensor = snapshot.sensors.find((s) => s.sensor_id === sc.sensor_id);
                          return sensor?.spatial_position ?? sc.sensor_id;
                        }).filter((pos, i, arr) => arr.indexOf(pos) === i).join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {w.sensor_contribution?.slice(0, 3).map((sc) => sc.sensor_id).join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          w.event_status === "closed" ? "bg-green-500/20 text-green-100" :
                          w.event_status === "handling" ? "bg-orange-500/20 text-orange-100" :
                          w.event_status === "verifying" ? "bg-yellow-500/20 text-yellow-100" :
                          w.event_status === "reviewing" ? "bg-cyan-500/20 text-cyan-100" :
                          "bg-gray-500/20 text-gray-100"
                        }`}>
                          {statusText[w.event_status ?? "pending"] ?? "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{w.owner ?? "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CockpitSectionPanel>
      ) : null}

      {isWarningPage || routePath.includes("[id]") || routeParams?.id ? (
        <CockpitSectionPanel title="事件详情与处置记录" badge={selectedWarning?.event_id ?? "none"} tone={selectedWarning ? riskTone[riskCode(selectedWarning)] : "neutral"}>
          {selectedWarning ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <KeyValueList items={[
                { label: "事件编号", value: selectedWarning.event_id },
                { label: "矿井", value: selectedWarning.mine_id },
                { label: "动态风险", value: selectedWarning.dynamic_risk.toFixed(3) },
                { label: "静态风险", value: selectedWarning.static_risk.toFixed(3) },
                { label: "综合风险", value: selectedWarning.combined_risk.toFixed(3) },
                { label: "确认状态", value: selectedWarning.confirm_status ?? "待确认" },
                { label: "摘要", value: selectedWarning.summary ?? "-" },
              ]} />
              <TimelineList items={eventStageItems(selectedWarning)} />
            </div>
          ) : <EmptyState title="暂无事件详情" description="后端未返回匹配事件。" />}
        </CockpitSectionPanel>
      ) : null}

      {routeParams?.id || routePath === "/warning/events/[id]" || routePath === "/source-tracing/events/[id]" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <OutburstRiskExplanationPanel warning={selectedWarning} contributions={contributionRows} />
          <OutburstClosureTemplatePanel sourceType={sourceType} />
          <OutburstDisposalAdvicePanel sourceType={sourceType} riskLevel={riskCode(selectedWarning)} />
          <CockpitSectionPanel title="人工复核提示" badge="review required" tone="warning">
            <p className="text-sm leading-6 text-muted">
              R 通道事件显示为真实传感器触发；B 通道贡献只能显示为辅助前兆/待复核；来源无法判断时按后端返回、来源待确认处理。
            </p>
          </CockpitSectionPanel>
        </div>
      ) : null}

      {routePath === "/data/features" || routePath === "/source-tracing/attention" ? (
        <OutburstSourceBoundaryPanel observedNodeCount={observedNodeCount} />
      ) : null}

      {routePath === "/data/static" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <OutburstSourceBoundaryPanel observedNodeCount={observedNodeCount} />
          <OutburstClosureTemplatePanel sourceType="static_prior" />
          <OutburstDisposalAdvicePanel sourceType="static_prior" riskLevel={riskCode(selectedWarning)} />
          <CockpitSectionPanel title="静态风险试算结果" badge="trial" tone="info">
            {staticRiskResult ? <KeyValueList items={resultItems(staticRiskResult)} /> : <p className="text-sm leading-6 text-muted">静态风险试算结果只作为试算结果展示，不写正式 warning_results。</p>}
          </CockpitSectionPanel>
        </div>
      ) : null}

      {routePath === "/model/evaluation" ? (
        <CockpitSectionPanel title="批量 dry-run 解释" badge="no write" tone="info">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-muted">
              批量推理默认 dry_run=true，不写入正式 warning_results；如果结果中含 B01-B41 生成/估计通道，只能标注为辅助训练/解释线索。
            </p>
            {batchResult ? <KeyValueList items={resultItems(batchResult)} /> : <p className="text-sm leading-6 text-muted">等待手动执行 dry-run 后展示风险分布、最高风险、失败数或耗时等后端返回字段。</p>}
          </div>
        </CockpitSectionPanel>
      ) : null}

      {isModelPage || routePath === "/data" || isSystemConfigPage ? (
        <CockpitSectionPanel title="模型配置与版本来源" badge={`${snapshot.configs.length} 项`} tone="info">
          <div className="mb-3 rounded-[5px] border border-orange-300/20 bg-orange-400/10 p-3 text-xs leading-5 text-orange-50">
            GET config 仅作只读快照展示，敏感字段已脱敏；真实配置写入未开放，需要鉴权与审计后才能启用。
          </div>
          <DataTableShell
            columns={[
              { key: "key", label: "配置项" },
              { key: "value", label: "值" },
              { key: "description", label: "说明" },
              { key: "updatedAt", label: "更新时间" },
            ]}
            rows={configRows(snapshot.configs)}
          />
        </CockpitSectionPanel>
      ) : null}

      {isTracingPage ? (
        <>
          <CockpitSectionPanel title="致因链路分析" badge="风险传播路径" tone="warning">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-100">源头</span>
                <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-100">中间传导</span>
                <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="shrink-0 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-100">后果</span>
              </div>
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500"></div>
                <div className="space-y-6">
                  {[
                    { level: 1, title: "瓦斯涌出异常", sensor: contributionRows[0]?.sensor_id ?? "-", position: "-", contribution: contributionRows[0]?.contribution ?? 0, color: "red" },
                    { level: 2, title: "煤体应力集中", sensor: contributionRows[1]?.sensor_id ?? "-", position: "-", contribution: contributionRows[1]?.contribution ?? 0, color: "red" },
                    { level: 3, title: "微震活动增强", sensor: contributionRows[2]?.sensor_id ?? "-", position: "-", contribution: contributionRows[2]?.contribution ?? 0, color: "orange" },
                    { level: 4, title: "电磁辐射升高", sensor: contributionRows[3]?.sensor_id ?? "-", position: "-", contribution: contributionRows[3]?.contribution ?? 0, color: "orange" },
                    { level: 5, title: "通风扰动加剧", sensor: contributionRows[4]?.sensor_id ?? "-", position: "-", contribution: contributionRows[4]?.contribution ?? 0, color: "yellow" },
                    { level: 6, title: "瓦斯浓度超限", sensor: contributionRows[5]?.sensor_id ?? "-", position: "-", contribution: contributionRows[5]?.contribution ?? 0, color: "yellow" },
                  ].map((item, index) => (
                    <div key={item.level} className="relative flex items-start gap-4 pl-12">
                      <div className={`absolute left-6 top-1 h-4 w-4 rounded-full border-2 ${
                        item.color === "red" ? "border-red-500 bg-red-500/30" :
                        item.color === "orange" ? "border-orange-500 bg-orange-500/30" :
                        "border-yellow-500 bg-yellow-500/30"
                      }`}></div>
                      <div className="flex-1 rounded-[5px] border border-cyan-300/18 bg-cyan-300/6 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{item.title}</span>
                          <span className="text-xs text-muted">贡献度: {(item.contribution * 100).toFixed(2)}%</span>
                        </div>
                        <div className="mt-1 text-xs text-muted">传感器: {item.sensor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CockpitSectionPanel>
          <CockpitSectionPanel title="贡献节点明细" badge="top 63" tone="info">
            <DataTableShell
              columns={[
                { key: "rank", label: "排名" },
                { key: "sensor", label: "节点" },
                { key: "indicator", label: "监测指标" },
                { key: "system", label: "分系统" },
                { key: "contribution", label: "贡献度" },
                { key: "position", label: "空间位置" },
              ]}
              rows={contributionDetailRows(contributionRows, snapshot.meta)}
              rowClassName={(_, rowIndex) => rowIndex < 5 ? "text-red-400" : ""}
            />
          </CockpitSectionPanel>
        </>
      ) : null}

      {routePath === "/twin/risk-heatmap" ? (
        <CockpitSectionPanel title="贡献节点明细" badge="top 63" tone="info">
          <DataTableShell
            columns={[
              { key: "rank", label: "排名" },
              { key: "sensor", label: "节点" },
              { key: "indicator", label: "监测指标" },
              { key: "system", label: "分系统" },
              { key: "contribution", label: "贡献度" },
              { key: "position", label: "空间位置" },
            ]}
            rows={contributionDetailRows(contributionRows, snapshot.meta)}
            rowClassName={(_, rowIndex) => rowIndex < 5 ? "text-red-400" : ""}
          />
        </CockpitSectionPanel>
      ) : null}


    </CockpitPageFrame>
  );
}
