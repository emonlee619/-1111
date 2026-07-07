import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Clock,
  Database,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  Layers3,
  Link2,
  LockKeyhole,
  Map,
  Network,
  RotateCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Zap,
} from "lucide-react";
import {
  CockpitHeroPanel,
  CockpitMetricCard,
  CockpitPageFrame,
  CockpitSectionPanel,
} from "@/components/cockpit";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { generatedChannelNames, realChannelNames, riskLevelText, statusText, versionStatusText } from "@/data/mockConstants";
import { mockAgent } from "@/data/mockAgent";
import { mockDataModel } from "@/data/mockDataModel";
import { mockDoublePrevention } from "@/data/mockDoublePrevention";
import { mockMonitoring } from "@/data/mockMonitoring";
import { mockSourceTracing } from "@/data/mockSourceTracing";
import { mockSystem } from "@/data/mockSystem";
import { mockTwin } from "@/data/mockTwin";
import { mockWarnings } from "@/data/mockWarnings";
import { getChannelTrendData, healthLabel, riskLabel } from "@/data/selectors";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type {
  BusinessPageContent,
  FeatureDimension,
  ModelVersion,
  OperationLog,
  SensorChannel,
  WarningEvent,
} from "@/types/business";
import type { CockpitMetricView, QuickActionItem } from "@/types/cockpit";
import type { RouteMeta } from "@/types/navigation";
import type { RiskLevel, StatusTone } from "@/types/risk";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Stage6SecondaryWorkstationPageProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
  routeParams?: Record<string, string>;
};

type WorkbenchRow = Record<string, ReactNode>;

type WorkbenchColumn = {
  key: string;
  label: string;
};

const stage6Paths = new Set([
  "/source-tracing/attention",
  "/source-tracing/events/[id]",
  "/twin/tunnel",
  "/twin/risk-heatmap",
  "/twin/sensors",
  "/data/augmentation",
  "/model/evaluation",
  "/agent",
  "/system/users",
  "/system/logs",
  "/system/config",
  "/data/features",
  "/data/datasets",
  "/model/version",
]);

const riskCellClass: Record<RiskLevel, string> = {
  low: "border-sky-300/36 bg-sky-400/15 text-sky-100",
  normal: "border-yellow-300/42 bg-yellow-400/18 text-yellow-100",
  high: "border-orange-300/45 bg-orange-400/20 text-orange-100",
  critical: "border-red-300/48 bg-red-500/24 text-red-100",
};

const toneTextClass: Record<StatusTone, string> = {
  neutral: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

const toneBorderClass: Record<StatusTone, string> = {
  neutral: "border-slate-400/22 bg-slate-500/10",
  success: "border-emerald-300/30 bg-emerald-400/12",
  warning: "border-amber-300/32 bg-amber-400/13",
  danger: "border-red-300/35 bg-red-500/14",
  info: "border-cyan-300/26 bg-cyan-300/10",
};

export function isStage6Path(path: string) {
  return stage6Paths.has(path);
}

function iconNode(Icon: LucideIcon) {
  return <Icon className="h-4 w-4" aria-hidden />;
}

function renderDisplayCopy(value: ReactNode) {
  return typeof value === "string" ? cleanDisplayCopy(value) : value;
}

function shortWarningId(id: string) {
  const index = mockWarnings.events.findIndex((event) => event.id === id);
  return index >= 0 ? `W${String(index + 1).padStart(3, "0")}` : id;
}

function resolveWarningEvent(id?: string) {
  if (!id) {
    return mockWarnings.events[0];
  }

  return mockWarnings.events.find((event, index) => event.id === id || `W${String(index + 1).padStart(3, "0")}` === id);
}

function WorkstationMetrics({ metrics }: { metrics: CockpitMetricView[] }) {
  return (
    <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <CockpitMetricCard key={`${metric.label}-${metric.value}`} metric={metric} />
      ))}
    </div>
  );
}

function WorkstationColumns({
  left,
  center,
  right,
  compact = false,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 xl:grid-cols-[minmax(230px,0.86fr)_minmax(0,1.72fr)_minmax(230px,0.92fr)]",
        compact ? "xl:min-h-[426px]" : "xl:min-h-[468px]",
      )}
    >
      <aside className="order-2 grid min-w-0 content-start gap-3 xl:order-1">{left}</aside>
      <div className="order-1 min-w-0 xl:order-2">{center}</div>
      <aside className="order-3 grid min-w-0 content-start gap-3">{right}</aside>
    </div>
  );
}

function BoundaryNote({ children, subdued = false }: { children: ReactNode; subdued?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[5px] border px-3 py-2 text-xs leading-5 text-muted",
        subdued ? "border-slate-500/20 bg-slate-900/30" : "border-cyan-300/14 bg-[#03101f]/44",
      )}
    >
      {renderDisplayCopy(children)}
    </div>
  );
}

function DenseList({
  items,
}: {
  items: { label: string; value: string; meta?: string; tone?: StatusTone; risk?: RiskLevel; href?: string }[];
}) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const content = (
          <>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate text-ink">{cleanDisplayCopy(item.label)}</span>
              {item.risk ? <RiskLevelBadge level={item.risk} /> : <StatusBadge tone={item.tone ?? "neutral"}>{cleanDisplayCopy(item.value)}</StatusBadge>}
            </div>
            {item.meta ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{cleanDisplayCopy(item.meta)}</p> : null}
          </>
        );

        if (item.href) {
          return (
            <li key={`${item.label}-${item.value}`}>
              <Link
                href={item.href}
                className="block min-w-0 rounded-[5px] border border-cyan-300/14 bg-[#03101f]/42 px-2.5 py-2 transition hover:border-cyan-300/40 hover:bg-cyan-300/8"
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li key={`${item.label}-${item.value}`} className="min-w-0 rounded-[5px] border border-cyan-300/14 bg-[#03101f]/42 px-2.5 py-2">
            {content}
          </li>
        );
      })}
    </ul>
  );
}

function KeyValueGrid({ items }: { items: { label: string; value: ReactNode; tone?: StatusTone }[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => (
        <div key={item.label} className={cn("grid gap-1 rounded-[5px] border px-2.5 py-2", toneBorderClass[item.tone ?? "info"])}>
          <dt className="text-[11px] text-muted">{cleanDisplayCopy(item.label)}</dt>
          <dd className={cn("break-words text-sm font-medium text-ink", item.tone ? toneTextClass[item.tone] : undefined)}>{renderDisplayCopy(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProgressList({
  items,
}: {
  items: { label: string; value: number; meta?: string; tone?: StatusTone }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted">{cleanDisplayCopy(item.label)}</span>
            <span className={cn("font-semibold", toneTextClass[item.tone ?? "info"])}>{item.value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
            <span
              className={cn(
                "block h-full rounded-full",
                item.tone === "success" && "bg-success",
                item.tone === "warning" && "bg-warning",
                item.tone === "danger" && "bg-danger",
                (!item.tone || item.tone === "info" || item.tone === "neutral") && "bg-primary",
              )}
              style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
            />
          </div>
          {item.meta ? <p className="mt-1 truncate text-[11px] text-muted">{cleanDisplayCopy(item.meta)}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function WorkbenchTable({
  columns,
  rows,
  subdued = false,
}: {
  columns: WorkbenchColumn[];
  rows: WorkbenchRow[];
  subdued?: boolean;
}) {
  return (
    <div className="console-scrollbar min-w-0 max-w-full overflow-x-auto">
      <table className="min-w-[680px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "whitespace-nowrap border-b px-3 py-2 text-xs font-medium text-muted",
                  subdued ? "border-slate-500/22 bg-slate-500/8" : "border-cyan-300/18 bg-cyan-300/8",
                )}
              >
                {cleanDisplayCopy(column.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={cn(subdued ? "hover:bg-slate-500/8" : "hover:bg-cyan-300/6")}>
              {columns.map((column) => (
                <td key={column.key} className="max-w-[16rem] border-b border-cyan-300/10 px-3 py-2 text-xs leading-5 text-ink">
                  <span className="line-clamp-2">{renderDisplayCopy(row[column.key])}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickLinks({ actions, subdued = false }: { actions: QuickActionItem[]; subdued?: boolean }) {
  return (
    <section className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={`${action.label}-${action.href ?? "button"}`}
          href={action.href ?? "#"}
          className={cn(
            "cockpit-chamfer-md group relative min-h-[84px] overflow-hidden rounded-[7px] border p-3 transition",
            subdued
              ? "border-slate-500/22 bg-[#071421]/72 hover:border-cyan-300/35 hover:bg-slate-700/14"
              : "border-[var(--mine-border)] bg-[#061a31]/78 hover:border-cyan-300/55 hover:bg-cyan-300/10 hover:shadow-[0_0_22px_rgba(34,211,238,0.16)]",
          )}
        >
          <span className={cn("absolute inset-x-3 top-0 h-px", subdued ? "bg-slate-400/34" : "bg-cyan-200/50")} />
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border",
                subdued ? "border-slate-500/24 bg-slate-500/10 text-slate-200" : "border-cyan-300/28 bg-cyan-300/10 text-primary",
              )}
            >
              {action.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{cleanDisplayCopy(action.label)}</span>
              {action.description ? <span className="mt-1 block truncate text-xs text-muted">{cleanDisplayCopy(action.description)}</span> : null}
            </span>
          </div>
          {action.status ? <span className={cn("absolute bottom-3 right-3 text-xs", subdued ? "text-slate-300" : "text-primary")}>{cleanDisplayCopy(action.status)}</span> : null}
        </Link>
      ))}
    </section>
  );
}

function MiniTrend({ color = "#22d3ee" }: { color?: string }) {
  const points = getChannelTrendData(mockMonitoring.realChannels[0]);

  return (
    <div className="relative min-h-[160px] overflow-hidden rounded-[6px] border border-cyan-300/16 bg-[#020b18]/62 p-3">
      <svg viewBox="0 0 360 150" className="h-[150px] w-full" aria-label="mock 趋势曲线" role="img">
        <g stroke="rgba(125,211,252,0.12)" strokeWidth="1">
          {[28, 58, 88, 118].map((y) => <line key={y} x1="16" x2="344" y1={y} y2={y} />)}
        </g>
        <polyline
          points={points.map((point, index) => `${24 + index * 62},${124 - point.value * 28}`).join(" ")}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <circle key={point.time} cx={24 + index * 62} cy={124 - point.value * 28} r="4" fill={color} />
        ))}
      </svg>
    </div>
  );
}

function AttentionMatrixVisual() {
  const rows = mockSourceTracing.attentionWeights;
  const columns = ["瓦斯", "风压", "微震", "扰动", "地质"];
  const heat = [
    [0.42, 0.18, 0.08, 0.21, 0.11],
    [0.20, 0.36, 0.12, 0.18, 0.08],
    [0.16, 0.09, 0.31, 0.15, 0.13],
    [0.11, 0.18, 0.10, 0.29, 0.17],
  ];

  return (
    <div className="relative min-h-[322px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_38%,rgba(239,68,68,0.14),transparent_14rem),radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_16rem)]" />
      <div className="relative grid gap-3 lg:grid-cols-[1fr_0.84fr]">
        <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
          <div className="mb-3 grid grid-cols-[7rem_repeat(5,minmax(2.6rem,1fr))] gap-1 text-center text-[11px] text-muted">
            <span />
            {columns.map((column) => <span key={column}>{column}</span>)}
          </div>
          <div className="grid gap-1">
            {rows.map((row, rowIndex) => (
              <div key={row.feature} className="grid grid-cols-[7rem_repeat(5,minmax(2.6rem,1fr))] gap-1">
                <span className="truncate rounded-[4px] border border-cyan-300/14 bg-cyan-300/8 px-2 py-2 text-xs text-ink">{row.feature}</span>
                {heat[rowIndex].map((value, index) => (
                  <span
                    key={`${row.feature}-${columns[index]}`}
                    className="rounded-[4px] border px-2 py-2 text-center text-xs font-semibold text-ink"
                    style={{
                      borderColor: `rgba(34, 211, 238, ${0.12 + value})`,
                      backgroundColor: `rgba(239, 68, 68, ${value * 0.5})`,
                    }}
                  >
                    {value.toFixed(2)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-3 text-sm font-semibold text-ink">贡献变化趋势</p>
            <MiniTrend color="#f97316" />
          </div>
          <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
            <p className="text-sm font-semibold text-ink">主导贡献源</p>
            <p className="mt-2 text-2xl font-semibold text-orange-100">瓦斯传感器组（一区）</p>
            <p className="mt-1 text-xs text-muted">贡献度 28.7%，需结合现场通风与瓦斯复核。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CausalChainVisual({ event }: { event: WarningEvent }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(249,115,22,0.16),transparent_14rem),radial-gradient(circle_at_28%_28%,rgba(34,211,238,0.14),transparent_14rem)]" />
      <div className="relative grid gap-3 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[6px] border border-orange-300/24 bg-orange-400/10 p-3">
          <p className="text-xs text-muted">危险源定位</p>
          <p className="mt-2 text-xl font-semibold text-orange-100">{event.regionName}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{event.summary}</p>
          <div className="mt-3 grid gap-2">
            {event.relatedChannels.map((channel) => (
              <span key={channel} className="rounded-[5px] border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-2 text-xs text-cyan-100">
                {channel} / 关联曲线已进入复核队列
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
          <div className="grid gap-3">
            {mockSourceTracing.causalChain.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[3.5rem_1fr] gap-3">
                <span className={cn("pt-1 text-xs font-semibold", toneTextClass[step.tone ?? "info"])}>{step.time}</span>
                <div className="relative rounded-[5px] border border-cyan-300/16 bg-cyan-300/7 px-3 py-2">
                  {index < mockSourceTracing.causalChain.length - 1 ? <span className="absolute -bottom-3 left-4 h-3 w-px bg-cyan-300/28" /> : null}
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TunnelVisual() {
  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(34,211,238,0.20),transparent_18rem),radial-gradient(circle_at_62%_62%,rgba(249,115,22,0.16),transparent_12rem)]" />
      <svg viewBox="0 0 900 430" className="absolute inset-0 h-full w-full" role="img" aria-label="巷道线框、区域标注和风险点">
        <g opacity="0.46" stroke="rgba(125,211,252,0.16)" strokeWidth="1">
          {Array.from({ length: 10 }).map((_, index) => (
            <path key={`depth-${index}`} d={`M${index * 90 - 70} 350 L${318 + index * 28} 78 L${900 + index * 40} 262`} fill="none" />
          ))}
          {Array.from({ length: 6 }).map((_, index) => (
            <path key={`level-${index}`} d={`M88 ${130 + index * 42} C280 ${76 + index * 24} 560 ${82 + index * 40} 824 ${138 + index * 30}`} fill="none" />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M116 278 L286 230 L430 252 L620 190 L786 232" stroke="#38bdf8" strokeWidth="7" />
          <path d="M196 318 L354 282 L526 304 L744 260" stroke="rgba(34,211,238,0.72)" strokeWidth="5" />
          <path d="M286 230 L324 148 L452 120 L620 190" stroke="rgba(96,165,250,0.55)" strokeWidth="4" />
          <path d="M430 252 L388 354 L252 370" stroke="rgba(125,211,252,0.42)" strokeWidth="3" />
        </g>
        {[
          [286, 230, "high"],
          [452, 120, "normal"],
          [620, 190, "low"],
          [526, 304, "normal"],
          [744, 260, "low"],
        ].map(([x, y, level]) => (
          <g key={`${x}-${y}`}>
            <circle cx={Number(x)} cy={Number(y)} r="10" className={cn(level === "high" && "fill-orange-400", level === "normal" && "fill-yellow-300", level === "low" && "fill-cyan-300")} />
            <circle cx={Number(x)} cy={Number(y)} r="24" fill="none" stroke="currentColor" className={cn(level === "high" && "text-orange-300", level === "normal" && "text-yellow-300", level === "low" && "text-cyan-300")} strokeOpacity="0.32" />
          </g>
        ))}
      </svg>
      <div className="absolute left-[9%] top-[16%] rounded-[5px] border border-cyan-300/28 bg-[#061a31]/88 px-3 py-2 text-xs">
        <p className="font-semibold text-ink">东翼回风巷</p>
        <p className="text-muted">轻量空间示意</p>
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-4">
        {["旋转", "平移", "缩放", "图层"].map((item) => (
          <span key={item} className="rounded-[5px] border border-cyan-300/18 bg-[#03101f]/66 px-2 py-1.5 text-center text-xs text-muted">
            {item}控制只读
          </span>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid() {
  const cells = Array.from({ length: 24 }, (_, index) => {
    const source = mockTwin.heatmapCells[index % mockTwin.heatmapCells.length];
    const level = index === 7 ? "critical" : index % 5 === 0 ? "high" : source.riskLevel;
    return { ...source, id: `${source.id}-${index}`, riskLevel: level as RiskLevel };
  });

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {cells.map((cell, index) => (
        <div key={cell.id} className={cn("aspect-square rounded-[5px] border p-2", riskCellClass[cell.riskLevel])}>
          <p className="text-xs font-semibold">R{String(index + 1).padStart(2, "0")}</p>
          <p className="mt-1 line-clamp-2 text-[11px] opacity-80">{cell.riskPoint}</p>
        </div>
      ))}
    </div>
  );
}

function SensorMap() {
  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-[6px] border border-cyan-300/18 bg-[#020b18]/70">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(72,160,220,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(72,160,220,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      {mockTwin.sensorPoints.map((point, index) => (
        <div
          key={point.id}
          className={cn(
            "absolute flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold",
            point.health === "online" ? "border-emerald-300/60 bg-emerald-400/18 text-emerald-100" : "border-amber-300/60 bg-amber-400/18 text-amber-100",
          )}
          style={{ left: `${12 + (index % 4) * 22}%`, top: `${18 + Math.floor(index / 4) * 32}%` }}
          title={`${point.name} / ${point.regionName}`}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

function ChannelBlocks({ names, tone }: { names: string[]; tone: "real" | "generated" }) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-5">
      {names.map((name, index) => (
        <span
          key={name}
          title={name}
          className={cn(
            "truncate rounded-[4px] border px-2 py-1.5 text-center text-[11px]",
            tone === "real" ? "border-cyan-300/24 bg-cyan-300/14 text-cyan-100" : "border-amber-300/24 bg-amber-300/14 text-amber-100",
          )}
        >
          {tone === "real" ? "R" : "G"}{String(index + 1).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

function AugmentationPipeline() {
  const steps = [
    { label: "真实通道", value: "14", tone: "info" as StatusTone },
    { label: "WGAN-GP 输出", value: "19", tone: "warning" as StatusTone },
    { label: "指标结构", value: "33", tone: "success" as StatusTone },
    { label: "验证指标", value: "AUC / KS", tone: "info" as StatusTone },
  ];

  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_34%,rgba(34,211,238,0.18),transparent_15rem),radial-gradient(circle_at_72%_54%,rgba(245,158,11,0.13),transparent_12rem)]" />
      <div className="relative grid gap-3">
        <div className="grid gap-3 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.label} className="relative rounded-[6px] border border-cyan-300/20 bg-[#061a31]/82 p-3">
              {index < steps.length - 1 ? <span className="absolute -right-3 top-1/2 hidden h-px w-3 bg-cyan-300/42 lg:block" /> : null}
              <p className="text-xs text-muted">{step.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{step.value}</p>
              <StatusBadge tone={step.tone}>{step.label === "WGAN-GP 输出" ? "辅助前兆" : "只读展示"}</StatusBadge>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-2 text-sm font-semibold text-ink">真实通道来源</p>
            <ChannelBlocks names={realChannelNames} tone="real" />
          </div>
          <div className="rounded-[6px] border border-amber-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-2 text-sm font-semibold text-ink">历史生成前兆说明</p>
            <ChannelBlocks names={generatedChannelNames} tone="generated" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfusionMatrix() {
  const cells = mockDataModel.modelEvaluation.confusionMatrix ?? [];
  const max = Math.max(...cells.map((cell) => cell.count), 1);

  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div
          key={`${cell.actual}-${cell.predicted}`}
          className="rounded-[6px] border border-cyan-300/18 p-3 text-center"
          style={{ backgroundColor: `rgba(34, 211, 238, ${0.08 + (cell.count / max) * 0.2})` }}
        >
          <p className="text-[11px] leading-5 text-muted">实际 {cell.actual}</p>
          <p className="text-[11px] leading-5 text-muted">预测 {cell.predicted}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{cell.count}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyBusinessState({ id }: { id?: string }) {
  return (
    <CockpitSectionPanel title="未匹配到演示事件" badge="空状态" tone="warning">
      <div className="rounded-[6px] border border-amber-300/24 bg-amber-400/10 p-5">
        <p className="text-lg font-semibold text-amber-100">没有找到事件 {id ?? "未提供"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">请从预警事件列表或溯源总览进入详情，当前页面不会尝试请求真实事件接口。</p>
        <Link
          href="/source-tracing/attention"
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-[4px] border border-cyan-300/24 bg-cyan-300/10 px-3 text-sm text-cyan-100 transition hover:border-cyan-300/50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回注意力分析
        </Link>
      </div>
    </CockpitSectionPanel>
  );
}

function SourceAttentionPage(props: Stage6SecondaryWorkstationPageProps) {
  const top = mockSourceTracing.attentionWeights[0];
  return (
    <WorkstationFrame {...props} kicker="注意力解释 / 时间窗口 / 传感器贡献" compactStatus="辅助解释">
      <WorkstationMetrics
        metrics={[
          { label: "贡献指标", value: String(mockSourceTracing.attentionWeights.length), unit: "项", hint: "Top 权重排行", trend: top.feature, risk: "normal", icon: iconNode(BarChart3), tone: "cyan", status: "解释" },
          { label: "关注窗口", value: "30", unit: "min", hint: "07:30-08:00", trend: "短窗趋势", risk: "low", icon: iconNode(Clock), tone: "blue", status: "窗口" },
          { label: "关联传感器", value: "4", unit: "组", hint: "真实 + 生成前兆", trend: "需人工复核", risk: "normal", icon: iconNode(CircleDot), tone: "amber", status: "关联" },
          { label: "置信度", value: "0.86", hint: "mock 解释可信度", trend: "较昨日 +0.05", risk: "low", icon: iconNode(ShieldCheck), tone: "green", status: "只读" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="筛选条件" badge="只读" tone="info">
              <KeyValueGrid
                items={[
                  { label: "事件窗口", value: "2026-06-27 07:30 ~ 08:00" },
                  { label: "传感器组", value: "瓦斯 / 风压 / 微震 / 采掘扰动" },
                  { label: "排序方式", value: "按贡献权重降序" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="贡献排行" badge="Top 4" tone="warning">
              <DenseList
                items={mockSourceTracing.attentionWeights.map((item) => ({
                  label: item.feature,
                  value: `${Math.round(item.weight * 100)}%`,
                  meta: `${item.channelId} / ${item.contribution}`,
                  tone: item.weight > 0.2 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="多源注意力热力矩阵"
            description="中心工作区展示贡献热力、时间趋势和主导贡献源，便于复核解释链路。"
            modeLabel="解释视图"
            modes={["热力矩阵", "时间曲线", "传感器雷达"]}
            activeMode="热力矩阵"
            legend={[
              { label: "真实通道", value: "14", tone: "info" },
              { label: "生成前兆", value: "19", tone: "warning" },
              { label: "辅助解释", tone: "success" },
            ]}
          >
            <AttentionMatrixVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="关联事件" badge="真实 mock id" tone="danger">
              <DenseList
                items={mockWarnings.events.map((event) => ({
                  label: shortWarningId(event.id),
                  value: riskLevelText[event.riskLevel],
                  meta: `${event.regionName} / ${event.summary}`,
                  risk: event.riskLevel,
                  href: `/source-tracing/events/${shortWarningId(event.id)}`,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="解释边界" badge="人工复核" tone="warning">
              <BoundaryNote>注意力权重用于辅助解释，不替代现场复核，不写入最终事故原因，也不触发真实处置流程。</BoundaryNote>
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickLinks
        actions={[
          { label: "事件追踪", href: "/source-tracing/events/W001", description: "打开 W001 溯源详情", status: "详情", icon: iconNode(GitBranch) },
          { label: "预警详情", href: "/warning/events/W001", description: "返回预警事件档案", status: "返回", icon: iconNode(ArrowLeft) },
          { label: "致因链路", href: "/source-tracing", description: "查看模块总览链路", status: "链路", icon: iconNode(Network) },
          { label: "AI问答", href: "/agent", description: "查询引用知识", status: "复核", icon: iconNode(Bot) },
        ]}
      />
      <BoundaryNote>参考图采用了注意力矩阵、贡献曲线、事件特征卡和底部提示；未采用高密度热图动效与真实模型推理入口，以保持可读和边界清晰。</BoundaryNote>
    </WorkstationFrame>
  );
}

function SourceEventDetailPage(props: Stage6SecondaryWorkstationPageProps) {
  const event = resolveWarningEvent(props.routeParams?.id);
  const displayId = event ? shortWarningId(event.id) : (props.routeParams?.id ?? "未提供");
  const relatedHazards = mockDoublePrevention.hazards.slice(0, 2);

  if (!event) {
    return (
      <WorkstationFrame {...props} kicker="事件追踪 / 业务化空状态" compactStatus="未匹配演示数据">
        <EmptyBusinessState id={props.routeParams?.id} />
      </WorkstationFrame>
    );
  }

  return (
    <WorkstationFrame {...props} kicker="事件摘要 / 危险源定位 / 致因链路" compactStatus={`事件 ${displayId}`}>
      <WorkstationMetrics
        metrics={[
          { label: "事件编号", value: displayId, hint: event.id, trend: event.eventTime, risk: event.riskLevel, icon: iconNode(AlertTriangle), tone: "amber", status: "追踪" },
          { label: "注意力权重", value: `${Math.round(mockSourceTracing.attentionWeights[0].weight * 100)}%`, hint: mockSourceTracing.attentionWeights[0].feature, trend: "主导贡献", risk: "normal", icon: iconNode(BarChart3), tone: "cyan", status: "解释" },
          { label: "关联隐患", value: String(relatedHazards.length), unit: "条", hint: "隐患台账摘要", trend: relatedHazards[0].currentStep, risk: relatedHazards[0].riskLevel, icon: iconNode(ShieldAlert), tone: "red", status: "治理" },
          { label: "复核状态", value: statusText[event.status], hint: event.owner, trend: "人工确认后使用", risk: "low", icon: iconNode(ShieldCheck), tone: "green", status: "复核" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="事件摘要" badge={displayId} tone="warning">
              <KeyValueGrid
                items={[
                  { label: "区域", value: event.regionName, tone: "warning" },
                  { label: "风险等级", value: riskLevelText[event.riskLevel], tone: event.riskLevel === "critical" || event.riskLevel === "high" ? "danger" : "warning" },
                  { label: "关联通道", value: event.relatedChannels.join(" / ") },
                  { label: "负责人", value: event.owner },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="返回入口" badge="真实 id" tone="info">
              <DenseList
                items={[
                  { label: "预警事件详情", value: displayId, meta: "按真实 mock id 返回", href: `/warning/events/${displayId}`, tone: "info" },
                  { label: "注意力分析", value: "解释", meta: "查看贡献矩阵与时间窗口", href: "/source-tracing/attention", tone: "info" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="危险源定位与致因链路"
            description="按 mock 事件汇总危险源、注意力权重、关联通道和链路节点。"
            modeLabel="详情视图"
            modes={["链路", "权重", "点位"]}
            activeMode="链路"
            legend={[
              { label: "危险源", value: event.regionName, tone: "warning" },
              { label: "人工复核", tone: "success" },
            ]}
            actions={[
              { label: "返回预警详情", href: `/warning/events/${displayId}`, icon: iconNode(ArrowLeft), tone: "primary" },
            ]}
          >
            <CausalChainVisual event={event} />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="注意力权重" badge="Top" tone="info">
              <ProgressList
                items={mockSourceTracing.attentionWeights.map((item) => ({
                  label: item.feature,
                  value: Math.round(item.weight * 100),
                  meta: item.channelId,
                  tone: item.weight > 0.2 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="关联隐患" badge="治理" tone="warning">
              <DenseList
                items={relatedHazards.map((hazard) => ({
                  label: hazard.id,
                  value: hazard.currentStep,
                  meta: `${hazard.description} / ${hazard.owner}`,
                  risk: hazard.riskLevel,
                  href: `/double-prevention/hazard-ledger/${hazard.id.replace("HZ-", "H")}`,
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote>溯源详情只展示辅助解释、危险源定位和关联证据，不把 mock 结果写入真实事件台账。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function TwinTunnelPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="巷道态势 / 线框示意 / 风险标注" compactStatus="空间快照">
      <WorkstationMetrics
        metrics={[
          { label: "巷道段", value: String(mockTwin.tunnelSegments.length), unit: "段", hint: "轻量线框示意", trend: "不加载真实三维资产", risk: "low", icon: iconNode(Boxes), tone: "cyan", status: "线框" },
          { label: "风险标注", value: String(mockTwin.heatmapCells.length), unit: "处", hint: "区域风险点", trend: "含橙色关注", risk: "high", icon: iconNode(Map), tone: "amber", status: "标注" },
          { label: "视角控制", value: "4", unit: "项", hint: "旋转/平移/缩放/图层", trend: "只读控制", risk: "low", icon: iconNode(SlidersHorizontal), tone: "blue", status: "控件" },
          { label: "更新时间", value: "09:30", hint: props.content.updatedAt, trend: "mock 空间数据", risk: "normal", icon: iconNode(Clock), tone: "green", status: "快照" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="区域分层" badge="巷道" tone="info">
              <DenseList
                items={mockTwin.tunnelSegments.map((item) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="视角控制" badge="只读" tone="info">
              <KeyValueGrid
                items={[
                  { label: "当前视角", value: "东翼回风巷 / 中部采掘区" },
                  { label: "透明度", value: "70%" },
                  { label: "图层", value: "巷道结构 / 风险点 / 传感器" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="轻量巷道态势示意"
            description="中心面板展示伪 3D 巷道线框、区域标注和风险点位。"
            modeLabel="空间模式"
            modes={["三维视角", "平面投影", "风险点"]}
            activeMode="三维视角"
            legend={[
              { label: "较大风险", value: "1", tone: "warning" },
              { label: "常规巡检", value: "2", tone: "info" },
            ]}
          >
            <TunnelVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="风险点摘要" badge="Top" tone="warning" moreHref="/twin/risk-heatmap">
              <DenseList
                items={mockTwin.heatmapCells.map((item) => ({
                  label: item.regionName,
                  value: riskLabel[item.riskLevel],
                  meta: item.riskPoint,
                  risk: item.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote>数字孪生页面不加载真实矿井三维模型，不展示敏感精确空间信息，也不接真实定位或监测流。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function TwinHeatmapPage(props: Stage6SecondaryWorkstationPageProps) {
  const highCount = mockTwin.heatmapCells.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length;

  return (
    <WorkstationFrame {...props} kicker="风险热力 / 时间窗口 / 重点区域" compactStatus="热力快照">
      <WorkstationMetrics
        metrics={[
          { label: "热力网格", value: "24", unit: "格", hint: "mock 网格视图", trend: "6 x 4 分区", risk: "normal", icon: iconNode(Map), tone: "cyan", status: "网格" },
          { label: "高风险区域", value: String(highCount), unit: "处", hint: "橙色以上", trend: "重点跟踪", risk: "high", icon: iconNode(AlertTriangle), tone: "amber", status: "关注" },
          { label: "时间窗口", value: "30", unit: "min", hint: "可筛选展示", trend: "09:00-09:30", risk: "low", icon: iconNode(Clock), tone: "blue", status: "窗口" },
          { label: "图例等级", value: "4", unit: "级", hint: "风险四色", trend: "蓝黄橙红", risk: "low", icon: iconNode(Gauge), tone: "green", status: "图例" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="筛选条件" badge="时间窗" tone="info">
              <KeyValueGrid
                items={[
                  { label: "区域", value: "全部区域" },
                  { label: "时间", value: "最近 30 分钟" },
                  { label: "风险阈值", value: "一般风险及以上" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="风险图例" badge="四色" tone="warning">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(riskLabel).map(([level, label]) => (
                  <div key={level} className={cn("rounded-[5px] border px-2 py-2 text-center text-xs", riskCellClass[level as RiskLevel])}>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 opacity-75">{level}</p>
                  </div>
                ))}
              </div>
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="风险热力网格"
            description="热力网格用于定位重点区域，颜色只表达演示数据风险等级。"
            modeLabel="热力模式"
            modes={["30分钟", "1小时", "24小时"]}
            activeMode="30分钟"
            legend={[
              { label: "重大", value: "1", tone: "danger" },
              { label: "较大", value: String(highCount), tone: "warning" },
              { label: "普通", tone: "info" },
            ]}
          >
            <div className="relative min-h-[330px] rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
              <HeatmapGrid />
            </div>
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="重点区域列表" badge="排序" tone="danger">
              <DenseList
                items={mockTwin.heatmapCells.map((item) => ({
                  label: item.regionName,
                  value: riskLabel[item.riskLevel],
                  meta: item.riskPoint,
                  risk: item.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote>风险热力为演示数据，不作为真实预测结果；时间窗口筛选仅改变展示语义，不请求真实计算服务。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function TwinSensorsPage(props: Stage6SecondaryWorkstationPageProps) {
  const online = mockTwin.sensorPoints.filter((point) => point.health === "online").length;
  const latest = mockTwin.sensorPoints[0]?.latestSampleAt ?? props.content.updatedAt;

  return (
    <WorkstationFrame {...props} kicker="点位列表 / 通道类型 / 健康状态" compactStatus="点位快照">
      <WorkstationMetrics
        metrics={[
          { label: "传感器点位", value: String(mockTwin.sensorPoints.length), unit: "个", hint: "脱敏点位", trend: "按区域分组", risk: "low", icon: iconNode(CircleDot), tone: "cyan", status: "点位" },
          { label: "在线点位", value: `${online}/${mockTwin.sensorPoints.length}`, hint: "健康状态", trend: "可读列表", risk: "low", icon: iconNode(CheckCircle2), tone: "green", status: "在线" },
          { label: "通道类型", value: "4", unit: "类", hint: "瓦斯/风压/微震/位移", trend: "真实通道", risk: "normal", icon: iconNode(Activity), tone: "blue", status: "通道" },
          { label: "最近上报", value: latest.slice(11), hint: latest, trend: "mock 时间", risk: "low", icon: iconNode(Clock), tone: "amber", status: "采样" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="筛选维度" badge="3 类" tone="info">
              <KeyValueGrid
                items={[
                  { label: "区域", value: "东翼 / 中部 / 西翼" },
                  { label: "通道类型", value: "CH4 / 风压 / 微震 / 位移" },
                  { label: "健康状态", value: "在线 / 校验 / 维护" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="点位示意" badge="脱敏" tone="success">
              <SensorMap />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="传感器点位清单"
            description="按点位、区域、通道类型、健康状态和最近上报时间组织巡检视图。"
            modeLabel="点位模式"
            modes={["列表", "点位示意", "健康状态"]}
            activeMode="列表"
            legend={[
              { label: "在线", value: String(online), tone: "success" },
              { label: "校验/维护", value: String(mockTwin.sensorPoints.length - online), tone: "warning" },
            ]}
          >
            <div className="relative rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-3">
              <WorkbenchTable
                columns={[
                  { key: "id", label: "点位" },
                  { key: "name", label: "通道" },
                  { key: "region", label: "区域" },
                  { key: "health", label: "健康" },
                  { key: "sampleAt", label: "最近上报" },
                ]}
                rows={mockTwin.sensorPoints.map((point: SensorChannel) => ({
                  id: point.id,
                  name: point.name,
                  region: point.regionName,
                  health: healthLabel[point.health],
                  sampleAt: point.latestSampleAt,
                }))}
              />
            </div>
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="健康状态摘要" badge={`${online}/${mockTwin.sensorPoints.length}`} tone="success">
              <ProgressList
                items={[
                  { label: "在线率", value: Math.round((online / mockTwin.sensorPoints.length) * 100), tone: "success", meta: "当前点位列表" },
                  { label: "需校验", value: 12, tone: "warning", meta: "mock 巡检占比" },
                  { label: "维护中", value: 6, tone: "info", meta: "演示状态" },
                ]}
              />
            </CockpitSectionPanel>
            <BoundaryNote>点位仅使用脱敏 mock 数据，不展示真实敏感空间坐标，不提供真实设备启停或校准操作。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function DataAugmentationPage(props: Stage6SecondaryWorkstationPageProps) {
  const augmentation = mockDataModel.augmentation;
  return (
    <WorkstationFrame {...props} kicker="数据增强 / 验证指标 / WGAN-GP 边界" compactStatus="只读展示">
      <WorkstationMetrics
        metrics={[
          { label: "真实通道", value: String(augmentation.realChannelCount), unit: "路", hint: "真实传感器来源", trend: "不与生成通道混写", risk: "low", icon: iconNode(Database), tone: "cyan", status: "真实" },
          { label: "生成前兆通道", value: String(augmentation.generatedChannelCount), unit: "路", hint: "WGAN-GP 输出结果", trend: "辅助前兆指标", risk: "normal", icon: iconNode(Zap), tone: "amber", status: "辅助" },
          { label: "指标结构", value: String(augmentation.featureCount), unit: "维", hint: "以后端元数据为准", trend: "动态覆盖", risk: "low", icon: iconNode(Layers3), tone: "green", status: "动态" },
          { label: "物理约束满足率", value: `${Math.round(augmentation.physicalConstraintRate * 100)}%`, hint: augmentation.datasetVersion, trend: "验证通过", risk: "low", icon: iconNode(ShieldCheck), tone: "blue", status: "验证" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="数据集版本" badge={augmentation.datasetVersion} tone="info">
              <KeyValueGrid
                items={[
                  { label: "数据集", value: augmentation.datasetVersion },
                  { label: "通道覆盖", value: `${augmentation.featureCount}/${augmentation.featureCount}` },
                  { label: "说明", value: "演示数据集版本，不下载真实训练数据。" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="通道构成" badge="动态" tone="warning">
              <ProgressList
                items={[
                  { label: "真实通道占比", value: Math.round((augmentation.realChannelCount / augmentation.featureCount) * 100), tone: "info", meta: "传感器来源" },
                  { label: "生成前兆占比", value: Math.round((augmentation.generatedChannelCount / augmentation.featureCount) * 100), tone: "warning", meta: "辅助指标" },
        { label: "指标结构覆盖", value: 100, tone: "success", meta: "动态元数据节点" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="WGAN-GP 数据增强结果与验证"
            description="中心工作区串联真实通道、历史生成指标边界、动态指标和验证指标。"
            modeLabel="数据链路"
            modes={["增强流程", "通道结构", "验证指标"]}
            activeMode="增强流程"
            legend={[
              { label: "真实", value: String(augmentation.realChannelCount), tone: "info" },
              { label: "生成", value: String(augmentation.generatedChannelCount), tone: "warning" },
              { label: "指标", value: String(augmentation.featureCount), tone: "success" },
            ]}
          >
            <AugmentationPipeline />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="增强验证指标" badge="AUC / KS" tone="success">
              <ProgressList
                items={[
                  { label: "物理约束满足率", value: Math.round(augmentation.physicalConstraintRate * 100), tone: "success", meta: "规则范围校验" },
                  { label: "对抗验证 AUC", value: Math.round(augmentation.adversarialValidationAuc * 100), tone: "info", meta: String(augmentation.adversarialValidationAuc) },
                  { label: "KS 检验通过率", value: Math.round(augmentation.ksPassRate * 100), tone: "success", meta: "分布一致性" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="生成通道边界" badge="必须复核" tone="warning">
              <BoundaryNote>生成通道为辅助前兆指标，不替代真实传感器监测；本页不训练 WGAN-GP，不保存模型权重，不提交大型训练数据。</BoundaryNote>
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickLinks
        actions={[
          { label: "后端指标字典", href: "/data/features", description: "查看真实来源和历史生成边界", status: "字典", icon: iconNode(Layers3) },
          { label: "数据集版本", href: "/data/datasets", description: "查看版本与质量", status: "版本", icon: iconNode(Database) },
          { label: "模型评估", href: "/model/evaluation", description: "验证模型表现", status: "评估", icon: iconNode(BrainCircuit) },
          { label: "版本管理", href: "/model/version", description: "查看模型版本", status: "只读", icon: iconNode(FileText) },
        ]}
      />
    </WorkstationFrame>
  );
}

function ModelEvaluationPage(props: Stage6SecondaryWorkstationPageProps) {
  const evaluation = mockDataModel.modelEvaluation;
  return (
    <WorkstationFrame {...props} kicker="模型评估 / 混淆矩阵 / 消融实验" compactStatus="评估快照">
      <WorkstationMetrics
        metrics={[
          { label: "召回率", value: `${Math.round(evaluation.recall * 100)}%`, hint: evaluation.datasetVersion, trend: "较高优先", risk: "low", icon: iconNode(Gauge), tone: "green", status: "召回" },
          { label: "误报率", value: `${Math.round(evaluation.falseAlarmRate * 100)}%`, hint: "演示指标", trend: "越低越好", risk: "normal", icon: iconNode(AlertTriangle), tone: "amber", status: "误报" },
          { label: "Macro-F1", value: `${Math.round(evaluation.macroF1 * 100)}%`, hint: evaluation.modelVersion, trend: "综合指标", risk: "low", icon: iconNode(BarChart3), tone: "cyan", status: "F1" },
          { label: "评估时间", value: evaluation.evaluatedAt?.slice(11) ?? "09:30", hint: evaluation.evaluatedAt ?? props.content.updatedAt, trend: "只读结果", risk: "low", icon: iconNode(Clock), tone: "blue", status: "快照" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="版本与数据" badge={evaluation.modelVersion} tone="info">
              <KeyValueGrid
                items={[
                  { label: "模型版本", value: evaluation.modelVersion },
                  { label: "数据版本", value: evaluation.datasetVersion },
                  { label: "评估时间", value: evaluation.evaluatedAt ?? props.content.updatedAt },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="核心指标" badge="只读" tone="success">
              <ProgressList
                items={[
                  { label: "召回率", value: Math.round(evaluation.recall * 100), tone: "success" },
                  { label: "Macro-F1", value: Math.round(evaluation.macroF1 * 100), tone: "info" },
                  { label: "准确率", value: Math.round((evaluation.accuracy ?? 0) * 100), tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="混淆矩阵与消融实验"
            description="核心工作区展示评估矩阵、消融对比、数据版本和局限性摘要。"
            modeLabel="评估视图"
            modes={["混淆矩阵", "消融实验", "版本信息"]}
            activeMode="混淆矩阵"
            legend={[
              { label: "模型", value: evaluation.modelVersion, tone: "info" },
              { label: "数据", value: evaluation.datasetVersion, tone: "success" },
            ]}
          >
            <div className="grid min-h-[330px] gap-3 rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="mb-3 text-sm font-semibold text-ink">混淆矩阵</p>
                <ConfusionMatrix />
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-ink">消融实验</p>
                <WorkbenchTable
                  columns={[
                    { key: "name", label: "方案" },
                    { key: "recall", label: "召回" },
                    { key: "falseAlarmRate", label: "误报" },
                    { key: "macroF1", label: "F1" },
                  ]}
                  rows={(evaluation.ablationExperiments ?? []).map((item) => ({
                    name: item.name,
                    recall: `${Math.round(item.recall * 100)}%`,
                    falseAlarmRate: `${Math.round(item.falseAlarmRate * 100)}%`,
                    macroF1: `${Math.round(item.macroF1 * 100)}%`,
                  }))}
                />
              </div>
            </div>
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="局限性说明" badge="不可验收替代" tone="warning">
              <DenseList
                items={evaluation.limitations.map((item, index) => ({
                  label: `限制 ${index + 1}`,
                  value: "说明",
                  meta: item,
                  tone: "warning",
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote>模型评估不调用真实评估任务，不部署模型，不上传或保存真实权重；mock 指标不作为正式验收指标。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function AgentPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="AI 辅助问答 / 引用知识 / 人工复核" compactStatus="辅助问答">
      <WorkstationMetrics
        metrics={[
          { label: "推荐问题", value: String(mockAgent.recommendedQuestions.length), unit: "个", hint: "常见风险咨询", trend: "可直接查看", risk: "normal", icon: iconNode(Bot), tone: "cyan", status: "推荐" },
          { label: "引用知识", value: String(mockAgent.citations.length), unit: "条", hint: "标准与场景", trend: "回答必须引用", risk: "low", icon: iconNode(Link2), tone: "green", status: "引用" },
          { label: "历史会话", value: "5", unit: "条", hint: "演示摘要", trend: "只读展示", risk: "low", icon: iconNode(Clock), tone: "blue", status: "历史" },
          { label: "人工复核", value: "必须", hint: "不替代安全判断", trend: "所有回答需复核", risk: "normal", icon: iconNode(ShieldCheck), tone: "amber", status: "复核" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="推荐问题" badge="换一批" tone="info">
              <DenseList
                items={mockAgent.recommendedQuestions.map((question, index) => ({
                  label: question,
                  value: `Q${index + 1}`,
                  meta: "点击后可作为问答输入参考",
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="历史会话摘要" badge="最近" tone="info">
              <DenseList
                items={[
                  { label: "瓦斯超限处置流程", value: "09:18", meta: "引用标准 2 条", tone: "info" },
                  { label: "隐患闭环当前节点", value: "08:56", meta: "关联 H001", tone: "warning" },
                  { label: "生成通道边界说明", value: "06-26", meta: "来自数据模型模块", tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="AI 辅助问答工作台"
            description="问答只提供解释与引用，不发出处置命令。"
            modeLabel="问答模式"
            modes={["问答", "引用", "历史"]}
            activeMode="问答"
            legend={[
              { label: "引用", value: String(mockAgent.citations.length), tone: "info" },
              { label: "人工复核", tone: "warning" },
            ]}
            actions={[
              { label: "发送演示问题", icon: iconNode(Send), disabled: true },
            ]}
          >
            <div className="grid min-h-[330px] content-between gap-3 rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
              <div className="rounded-[7px] border border-cyan-300/18 bg-[#061a31]/80 p-4">
                <p className="mb-2 text-xs text-muted">当前问题</p>
                <p className="rounded-[6px] border border-cyan-300/22 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                  东翼回风巷当前为什么被标记为较大风险？
                </p>
                <div className="mt-4 rounded-[6px] border border-cyan-300/16 bg-[#03101f]/64 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" aria-hidden />
                    <p className="text-sm font-semibold text-ink">回答摘要</p>
                  </div>
                  <p className="text-sm leading-7 text-muted">{mockAgent.mockAnswer}</p>
                </div>
              </div>
              <div className="flex min-h-[68px] items-center gap-3 rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 px-3 py-2 text-sm text-muted">
                <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate">请输入安全问题，Shift+Enter 换行；当前为演示输入，不调用真实模型。</span>
                <Send className="h-4 w-4 shrink-0 text-cyan-100" aria-hidden />
              </div>
            </div>
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="引用知识" badge="证据" tone="success">
              <DenseList
                items={mockAgent.citations.map((item) => ({
                  label: item.title,
                  value: item.id,
                  meta: `${item.category} / ${item.summary}`,
                  tone: "success",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="安全提示" badge="人工复核" tone="warning">
              <DenseList
                items={mockAgent.safetyPrompts.map((prompt, index) => ({
                  label: `提示 ${index + 1}`,
                  value: "必读",
                  meta: prompt,
                  tone: "warning",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function SystemUsersPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="用户权限 / 角色范围 / 只读操作" compactStatus="低装饰管理" subdued>
      <WorkstationMetrics
        metrics={[
          { label: "用户条目", value: String(mockSystem.users.length), unit: "类", hint: "脱敏演示用户", trend: "不接真实认证", risk: "low", icon: iconNode(Users), tone: "blue", status: "只读" },
          { label: "角色范围", value: "3", unit: "类", hint: "安全/监测/系统", trend: "静态枚举", risk: "low", icon: iconNode(LockKeyhole), tone: "cyan", status: "权限" },
          { label: "启用状态", value: "100%", hint: "演示状态", trend: "不执行停用", risk: "low", icon: iconNode(CheckCircle2), tone: "green", status: "状态" },
          { label: "最近登录", value: "09:28", hint: "mock 登录时间", trend: "脱敏展示", risk: "normal", icon: iconNode(Clock), tone: "amber", status: "日志" },
        ]}
      />
      <SystemColumns
        left={(
          <>
            <CockpitSectionPanel title="筛选与检索" badge="只读" tone="info" className="bg-[#071421]/82">
              <KeyValueGrid
                items={[
                  { label: "所属单位", value: "全部单位" },
                  { label: "角色", value: "全部角色" },
                  { label: "状态", value: "启用展示" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="角色分布" badge="3类" tone="info" className="bg-[#071421]/82">
              <ProgressList
                items={[
                  { label: "安全管理员", value: 34, tone: "info" },
                  { label: "监测人员", value: 33, tone: "success" },
                  { label: "系统管理员", value: 33, tone: "warning" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="用户权限列表" badge="表格优先" tone="info" className="bg-[#071421]/88" contentClassName="p-0">
            <WorkbenchTable
              subdued
              columns={[
                { key: "name", label: "用户" },
                { key: "role", label: "角色" },
                { key: "unit", label: "所属单位" },
                { key: "permissionScope", label: "权限范围" },
                { key: "status", label: "状态" },
                { key: "lastLoginAt", label: "最近登录" },
                { key: "action", label: "操作" },
              ]}
              rows={mockSystem.users.map((user) => ({ ...user, action: "查看 / 复核" }))}
            />
          </CockpitSectionPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="操作边界" badge="无写入" tone="warning" className="bg-[#071421]/82">
              <DenseList
                items={[
                  { label: "查看权限范围", value: "只读", meta: "展示角色与单位范围", tone: "info" },
                  { label: "编辑用户", value: "禁用", meta: "不接真实用户系统", tone: "warning" },
                  { label: "停用账号", value: "禁用", meta: "不执行真实账号操作", tone: "warning" },
                ]}
              />
            </CockpitSectionPanel>
            <BoundaryNote subdued>用户权限页不接真实认证、授权或账号系统，不展示真实个人敏感信息。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function SystemLogsPage(props: Stage6SecondaryWorkstationPageProps) {
  const riskLogs = mockSystem.logs.filter((log) => log.riskLevel).length;
  return (
    <WorkstationFrame {...props} kicker="操作日志 / 审计筛选 / 风险级别" compactStatus="低装饰管理" subdued>
      <WorkstationMetrics
        metrics={[
          { label: "日志条目", value: String(mockSystem.logs.length), unit: "条", hint: "mock 审计摘要", trend: "表格优先", risk: "low", icon: iconNode(FileText), tone: "blue", status: "日志" },
          { label: "风险动作", value: String(riskLogs), unit: "类", hint: "含风险级别", trend: "需复核", risk: "normal", icon: iconNode(AlertTriangle), tone: "amber", status: "风险" },
          { label: "筛选项", value: "5", unit: "项", hint: "模块/动作/结果/级别/时间", trend: "只读筛选", risk: "low", icon: iconNode(Filter), tone: "cyan", status: "筛选" },
          { label: "审计接入", value: "未接入", hint: "不读取真实日志", trend: "脱敏演示", risk: "low", icon: iconNode(ShieldCheck), tone: "green", status: "边界" },
        ]}
      />
      <SystemColumns
        left={(
          <>
            <CockpitSectionPanel title="筛选与检索" badge="只读" tone="info" className="bg-[#071421]/82">
              <KeyValueGrid
                items={[
                  { label: "时间范围", value: "今日 00:00 ~ 09:30" },
                  { label: "模块", value: "全部模块" },
                  { label: "风险级别", value: "全部级别" },
                  { label: "关键词", value: "操作人 / 动作" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="模块分布" badge="演示" tone="info" className="bg-[#071421]/82">
              <ProgressList
                items={[
                  { label: "预警事件", value: 42, tone: "warning" },
                  { label: "监测通道", value: 32, tone: "info" },
                  { label: "系统配置", value: 26, tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="操作日志列表" badge="审计表格" tone="info" className="bg-[#071421]/88" contentClassName="p-0">
            <WorkbenchTable
              subdued
              columns={[
                { key: "time", label: "操作时间" },
                { key: "actor", label: "操作人" },
                { key: "module", label: "模块" },
                { key: "action", label: "动作" },
                { key: "result", label: "结果" },
                { key: "risk", label: "风险级别" },
              ]}
              rows={mockSystem.logs.map((log: OperationLog) => ({ ...log, risk: log.riskLevel ? riskLevelText[log.riskLevel] : "无" }))}
            />
          </CockpitSectionPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="风险动作摘要" badge="复核" tone="warning" className="bg-[#071421]/82">
              <DenseList
                items={mockSystem.logs.map((log) => ({
                  label: log.action,
                  value: log.result,
                  meta: `${log.time} / ${log.module}`,
                  tone: log.riskLevel ? "warning" : "success",
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote subdued>操作日志页不接真实审计服务，不展示真实账号、IP 或敏感操作记录。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function SystemConfigPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="平台参数 / 阈值说明 / 通知策略" compactStatus="只读配置" subdued>
      <WorkstationMetrics
        metrics={[
          { label: "平台参数", value: String(mockSystem.configs.length), unit: "项", hint: "基础配置摘要", trend: "只读展示", risk: "low", icon: iconNode(Settings), tone: "blue", status: "参数" },
          { label: "矿井/区域", value: "1/3", hint: "示范矿井与区域", trend: "选择控件只读", risk: "low", icon: iconNode(Map), tone: "cyan", status: "区域" },
          { label: "刷新策略", value: "1", unit: "min", hint: "mock 刷新说明", trend: "不保存真实参数", risk: "low", icon: iconNode(RotateCw), tone: "green", status: "刷新" },
          { label: "通知配置", value: "未接入", hint: "短信/电话/企业微信/邮件", trend: "不触发真实渠道", risk: "normal", icon: iconNode(AlertTriangle), tone: "amber", status: "渠道" },
        ]}
      />
      <SystemColumns
        left={(
          <>
            <CockpitSectionPanel title="矿井与区域选择" badge="只读" tone="info" className="bg-[#071421]/82">
              <KeyValueGrid
                items={[
                  { label: "矿井", value: "红岩示范矿井" },
                  { label: "区域", value: "东翼采掘区 / 中部采掘区 / 西翼运输巷" },
                  { label: "配置状态", value: "演示快照" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="配置入口关系" badge="隐藏" tone="warning" className="bg-[#071421]/82">
              <BoundaryNote subdued>双控配置通过配置按钮或快捷入口进入，不作为双重预防二级 tab；系统配置属于系统管理路径。</BoundaryNote>
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="系统基础配置" badge="表单只读" tone="info" className="bg-[#071421]/88">
            <div className="grid gap-3 md:grid-cols-2">
              {mockSystem.configs.map((item) => (
                <div key={item.label} className="rounded-[6px] border border-slate-500/22 bg-slate-500/10 p-4">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink">{item.value}</p>
                </div>
              ))}
              <div className="rounded-[6px] border border-amber-300/24 bg-amber-400/10 p-4">
                <p className="text-xs text-muted">告警阈值展示</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-amber-100">仅展示阈值说明，不保存真实参数。</p>
              </div>
              <div className="rounded-[6px] border border-cyan-300/20 bg-cyan-300/8 p-4">
                <p className="text-xs text-muted">数据刷新策略</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-cyan-100">页面展示 mock 1 分钟刷新说明。</p>
              </div>
            </div>
          </CockpitSectionPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="通知配置边界" badge="无写入" tone="warning" className="bg-[#071421]/82">
              <DenseList
                items={[
                  { label: "短信", value: "未接入", meta: "不发送真实通知", tone: "warning" },
                  { label: "电话", value: "未接入", meta: "不触发外呼", tone: "warning" },
                  { label: "企业微信", value: "未接入", meta: "不调用生产渠道", tone: "warning" },
                  { label: "邮件", value: "未接入", meta: "不连接真实邮箱", tone: "warning" },
                ]}
              />
            </CockpitSectionPanel>
            <BoundaryNote subdued>系统配置页保持只读状态，不保存真实系统参数，不连接真实通知、认证或数据服务。</BoundaryNote>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function DataFeaturesPage(props: Stage6SecondaryWorkstationPageProps) {
  const rows = mockDataModel.featureDictionary.map((feature: FeatureDimension) => ({
    id: feature.id,
    name: feature.name,
    type: feature.type === "real_channel" ? "真实通道" : "生成前兆通道",
    source: feature.sourceChannel,
    unit: feature.unit,
    usage: feature.modelUsage,
    boundary: feature.boundary,
  }));

  return (
    <WorkstationFrame {...props} kicker="指标字典 / 来源通道 / 数据边界" compactStatus="轻量收敛">
      <WorkstationMetrics
        metrics={[
          { label: "指标节点", value: String(mockDataModel.augmentation.featureCount), unit: "维", hint: "以后端元数据和动态指标字典为准", trend: "字典完整", risk: "low", icon: iconNode(Layers3), tone: "cyan", status: "字典" },
          { label: "真实通道", value: String(mockDataModel.augmentation.realChannelCount), unit: "路", hint: "传感器来源", trend: "真实来源", risk: "low", icon: iconNode(Database), tone: "green", status: "真实" },
          { label: "生成指标", value: String(mockDataModel.augmentation.generatedChannelCount), unit: "项", hint: "辅助前兆指标", trend: "不替代监测", risk: "normal", icon: iconNode(Zap), tone: "amber", status: "辅助" },
          { label: "适用模型", value: "预警", hint: "模型输入说明", trend: "只读展示", risk: "low", icon: iconNode(BrainCircuit), tone: "blue", status: "用途" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="来源结构" badge="动态" tone="info">
              <ProgressList
                items={[
                  { label: "真实通道", value: 100, tone: "info" },
                  { label: "生成前兆", value: 0, tone: "warning" },
                  { label: "指标覆盖", value: 100, tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="边界说明" badge="必读" tone="warning">
              <BoundaryNote>生成指标不得写成真实传感器原始值；本页不修改 feature_schema 含义。</BoundaryNote>
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="后端指标字典" badge="表格" tone="info" contentClassName="p-0">
            <WorkbenchTable
              columns={[
                { key: "id", label: "指标编号" },
                { key: "name", label: "指标名称" },
                { key: "type", label: "类型" },
                { key: "source", label: "来源" },
                { key: "unit", label: "单位" },
                { key: "usage", label: "用途" },
                { key: "boundary", label: "边界" },
              ]}
              rows={rows}
            />
          </CockpitSectionPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="快捷入口" badge="数据链路" tone="info">
              <DenseList
                items={[
                  { label: "数据增强", value: "验证", meta: "查看 WGAN-GP 输出指标", href: "/data/augmentation", tone: "warning" },
                  { label: "数据集版本", value: "版本", meta: "查看数据覆盖与质量", href: "/data/datasets", tone: "info" },
                  { label: "模型评估", value: "评估", meta: "查看指标表现", href: "/model/evaluation", tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
    </WorkstationFrame>
  );
}

function DataDatasetsPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="数据集版本 / 质量评分 / 关联模型" compactStatus="轻量收敛">
      <WorkstationMetrics
        metrics={[
          { label: "数据集版本", value: String(mockDataModel.datasetVersions.length), unit: "个", hint: "mock 版本列表", trend: "只读", risk: "low", icon: iconNode(Database), tone: "cyan", status: "版本" },
          { label: "通道覆盖", value: "动态", hint: "以后端元数据为准", trend: "动态覆盖", risk: "low", icon: iconNode(Layers3), tone: "green", status: "覆盖" },
          { label: "质量评分", value: "91", hint: "演示质量指标", trend: "可用于评估", risk: "low", icon: iconNode(ShieldCheck), tone: "blue", status: "质量" },
          { label: "下载能力", value: "无", hint: "不下载真实数据集", trend: "只读展示", risk: "normal", icon: iconNode(LockKeyhole), tone: "amber", status: "边界" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="版本筛选" badge="只读" tone="info">
              <KeyValueGrid
                items={[
                  { label: "状态", value: "全部版本" },
                  { label: "关联模型", value: "MODEL-MOCK-1.2" },
                  { label: "时间范围", value: "2026-05 至 2026-06" },
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="质量指标" badge="演示" tone="success">
              <ProgressList
                items={[
                  { label: "质量评分", value: 91, tone: "success" },
                  { label: "通道覆盖", value: 100, tone: "info" },
                  { label: "样本可用性", value: 88, tone: "success" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="数据集版本列表" badge="表格" tone="info" contentClassName="p-0">
            <WorkbenchTable
              columns={[
                { key: "version", label: "版本" },
                { key: "timeRange", label: "时间范围" },
                { key: "sampleCount", label: "样本数" },
                { key: "channelCoverage", label: "通道覆盖" },
                { key: "qualityScore", label: "质量评分" },
                { key: "relatedModel", label: "关联模型" },
                { key: "note", label: "备注" },
              ]}
              rows={mockDataModel.datasetVersions}
            />
          </CockpitSectionPanel>
        )}
        right={(
          <CockpitSectionPanel title="数据边界" badge="无下载" tone="warning">
            <BoundaryNote>本页不下载真实数据集，不上传大型训练数据，不接真实数据库或训练队列。</BoundaryNote>
          </CockpitSectionPanel>
        )}
      />
    </WorkstationFrame>
  );
}

function ModelVersionPage(props: Stage6SecondaryWorkstationPageProps) {
  return (
    <WorkstationFrame {...props} kicker="模型版本 / 数据版本 / 回滚边界" compactStatus="轻量收敛">
      <WorkstationMetrics
        metrics={[
          { label: "模型版本", value: String(mockDataModel.modelVersions.length), unit: "个", hint: "mock 版本列表", trend: "只读", risk: "low", icon: iconNode(FileText), tone: "cyan", status: "版本" },
          { label: "当前版本", value: "1.2", hint: "MODEL-MOCK-1.2", trend: "演示启用", risk: "low", icon: iconNode(CheckCircle2), tone: "green", status: "启用" },
          { label: "关联数据集", value: "DS-06", hint: mockDataModel.modelEvaluation.datasetVersion, trend: "评估快照", risk: "low", icon: iconNode(Database), tone: "blue", status: "数据" },
          { label: "回滚入口", value: "只读", hint: "不执行真实回滚", trend: "无模型仓库", risk: "normal", icon: iconNode(LockKeyhole), tone: "amber", status: "边界" },
        ]}
      />
      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="版本状态" badge="只读" tone="info">
              <DenseList
                items={mockDataModel.modelVersions.map((version: ModelVersion) => ({
                  label: version.version,
                  value: versionStatusText[version.status],
                  meta: `${version.datasetVersion} / ${version.releaseAt}`,
                  tone: version.status === "active" ? "success" : "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="版本边界" badge="无权重" tone="warning">
              <BoundaryNote>不上传、下载、部署或回滚真实模型权重，不接真实模型仓库。</BoundaryNote>
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitSectionPanel title="模型版本列表" badge="表格" tone="info" contentClassName="p-0">
            <WorkbenchTable
              columns={[
                { key: "version", label: "版本" },
                { key: "datasetVersion", label: "数据版本" },
                { key: "evaluationSummary", label: "评估摘要" },
                { key: "releaseAt", label: "发布时间" },
                { key: "status", label: "状态" },
                { key: "changeLog", label: "变更说明" },
              ]}
              rows={mockDataModel.modelVersions.map((version) => ({ ...version, status: versionStatusText[version.status] }))}
            />
          </CockpitSectionPanel>
        )}
        right={(
          <CockpitSectionPanel title="快捷入口" badge="模型链路" tone="info">
            <DenseList
              items={[
                { label: "模型评估", value: "评估", meta: "查看混淆矩阵与消融实验", href: "/model/evaluation", tone: "success" },
                { label: "数据增强", value: "验证", meta: "查看动态指标结构", href: "/data/augmentation", tone: "warning" },
                { label: "数据集版本", value: "数据", meta: "查看关联数据版本", href: "/data/datasets", tone: "info" },
              ]}
            />
          </CockpitSectionPanel>
        )}
      />
    </WorkstationFrame>
  );
}

function SystemColumns({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(230px,0.78fr)_minmax(0,1.7fr)_minmax(230px,0.82fr)]">
      <aside className="order-2 grid min-w-0 content-start gap-3 xl:order-1">{left}</aside>
      <div className="order-1 min-w-0 xl:order-2">{center}</div>
      <aside className="order-3 grid min-w-0 content-start gap-3">{right}</aside>
    </div>
  );
}

function WorkstationFrame({
  meta,
  content,
  kicker,
  compactStatus,
  children,
  subdued = false,
}: Stage6SecondaryWorkstationPageProps & {
  kicker: string;
  compactStatus: string;
  children: ReactNode;
  subdued?: boolean;
}) {
  return (
    <CockpitPageFrame
      meta={meta}
      content={content}
      kicker={kicker}
      compactStatus={compactStatus}
      className={cn(subdued && "xl:[&_.cockpit-chamfer-lg]:shadow-none xl:[&_.cockpit-chamfer-md]:shadow-none")}
    >
      {children}
    </CockpitPageFrame>
  );
}

export function Stage6SecondaryWorkstationPage(props: Stage6SecondaryWorkstationPageProps) {
  switch (props.content.path) {
    case "/source-tracing/attention":
      return <SourceAttentionPage {...props} />;
    case "/source-tracing/events/[id]":
      return <SourceEventDetailPage {...props} />;
    case "/twin/tunnel":
      return <TwinTunnelPage {...props} />;
    case "/twin/risk-heatmap":
      return <TwinHeatmapPage {...props} />;
    case "/twin/sensors":
      return <TwinSensorsPage {...props} />;
    case "/data/augmentation":
      return <DataAugmentationPage {...props} />;
    case "/model/evaluation":
      return <ModelEvaluationPage {...props} />;
    case "/agent":
      return <AgentPage {...props} />;
    case "/system/users":
      return <SystemUsersPage {...props} />;
    case "/system/logs":
      return <SystemLogsPage {...props} />;
    case "/system/config":
      return <SystemConfigPage {...props} />;
    case "/data/features":
      return <DataFeaturesPage {...props} />;
    case "/data/datasets":
      return <DataDatasetsPage {...props} />;
    case "/model/version":
      return <ModelVersionPage {...props} />;
    default:
      return null;
  }
}
