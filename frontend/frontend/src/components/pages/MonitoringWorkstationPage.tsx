"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Gauge,
  LineChart,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CockpitBottomTicker,
  CockpitHeroPanel,
  CockpitMetricCard,
  CockpitPageFrame,
  CockpitSectionPanel,
} from "@/components/cockpit";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { riskLevelText, statusText } from "@/data/mockConstants";
import { mockMonitoring } from "@/data/mockMonitoring";
import { mockWarnings } from "@/data/mockWarnings";
import { getChannelTrendData, getMonitoringSummary, getWarningLevelData, healthLabel, riskLabel } from "@/data/selectors";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent, ChannelHealth, HandlingStatus, SensorChannel, WarningEvent } from "@/types/business";
import type { CockpitMetricView, QuickActionItem } from "@/types/cockpit";
import type { RouteMeta } from "@/types/navigation";
import type { RiskLevel, StatusTone } from "@/types/risk";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type MonitoringWorkstationPageProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
};

type SelectOption = {
  label: string;
  value: string;
};

type DenseItem = {
  label: string;
  value: string;
  meta?: string;
  tone?: StatusTone;
  risk?: RiskLevel;
  href?: string;
};

const healthTone: Record<ChannelHealth, StatusTone> = {
  online: "success",
  calibrating: "warning",
  maintenance: "warning",
  offline: "danger",
};

const healthColor: Record<ChannelHealth, string> = {
  online: "#22d3ee",
  calibrating: "#facc15",
  maintenance: "#fb923c",
  offline: "#f87171",
};

const riskTone: Record<RiskLevel, StatusTone> = {
  low: "info",
  normal: "warning",
  high: "warning",
  critical: "danger",
};

const handlingTone: Record<HandlingStatus, StatusTone> = {
  pending: "warning",
  verifying: "warning",
  handling: "info",
  reviewing: "info",
  closed: "success",
};

const signalColors = ["#22d3ee", "#34d399", "#60a5fa", "#f59e0b", "#a78bfa"];

function iconNode(Icon: LucideIcon) {
  return <Icon className="h-4 w-4" aria-hidden />;
}

function option(label: string, value: string): SelectOption {
  return { label, value };
}

function shortWarningId(id: string) {
  const index = mockWarnings.events.findIndex((event) => event.id === id);
  return index >= 0 ? `W${String(index + 1).padStart(3, "0")}` : id;
}

function channelCategory(channel: SensorChannel) {
  if (channel.name.includes("瓦斯")) {
    return "瓦斯监测";
  }
  if (channel.name.includes("风")) {
    return "通风系统";
  }
  if (channel.name.includes("温") || channel.name.includes("湿")) {
    return "环境参数";
  }
  if (channel.name.includes("压力") || channel.name.includes("应力")) {
    return "压力/应力";
  }
  if (channel.name.includes("微震") || channel.name.includes("声发射") || channel.name.includes("位移")) {
    return "地质扰动";
  }
  return "辅助气体";
}

function eventType(event: WarningEvent) {
  if (event.summary.includes("瓦斯")) {
    return "瓦斯超限";
  }
  if (event.summary.includes("压力") || event.summary.includes("应力")) {
    return "压力异常";
  }
  return "协同异常";
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
  className,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 gap-3 xl:grid-cols-[minmax(240px,0.86fr)_minmax(0,1.72fr)_minmax(250px,0.92fr)]", className)}>
      <aside className="order-2 grid min-w-0 content-start gap-3 xl:order-1">{left}</aside>
      <div className="order-1 min-w-0 xl:order-2">{center}</div>
      <aside className="order-3 grid min-w-0 content-start gap-3">{right}</aside>
    </div>
  );
}

function BoundaryNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[5px] border border-cyan-300/14 bg-[#03101f]/44 px-3 py-2 text-xs leading-5 text-muted">
      {typeof children === "string" ? cleanDisplayCopy(children) : children}
    </div>
  );
}

function DenseList({ items }: { items: DenseItem[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const row = (
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
                className="block min-w-0 rounded-[5px] border border-cyan-300/14 bg-[#03101f]/42 px-2.5 py-2 transition hover:border-cyan-300/42 hover:bg-cyan-300/8"
              >
                {row}
              </Link>
            </li>
          );
        }

        return (
          <li key={`${item.label}-${item.value}`} className="min-w-0 rounded-[5px] border border-cyan-300/14 bg-[#03101f]/42 px-2.5 py-2">
            {row}
          </li>
        );
      })}
    </ul>
  );
}

function ToolbarSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-[9rem] gap-1 text-[11px] text-muted">
      <span>{cleanDisplayCopy(label)}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[5px] border border-cyan-300/20 bg-[#04162b]/92 px-2 text-xs text-ink outline-none transition focus:border-cyan-300/60"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {cleanDisplayCopy(item.label)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="grid min-w-[13rem] flex-1 gap-1 text-[11px] text-muted">
      <span>检索</span>
      <span className="flex h-9 items-center gap-2 rounded-[5px] border border-cyan-300/20 bg-[#04162b]/92 px-2 focus-within:border-cyan-300/60">
        <Search className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
        />
      </span>
    </label>
  );
}

function FilterSurface({ children }: { children: ReactNode }) {
  return (
    <div className="cockpit-chamfer-sm flex min-w-0 flex-wrap items-end gap-3 rounded-[7px] border border-cyan-300/16 bg-[#061a31]/72 p-3 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]">
      <div className="flex min-h-9 items-center gap-2 pr-2 text-xs font-medium text-primary">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        筛选
      </div>
      {children}
    </div>
  );
}

function HealthDot({ health }: { health: ChannelHealth }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
      style={{ backgroundColor: healthColor[health], color: healthColor[health] }}
    />
  );
}

function InlineSparkline({ color = "#22d3ee", offset = 0 }: { color?: string; offset?: number }) {
  const points = Array.from({ length: 9 }).map((_, index) => {
    const x = 8 + index * 13;
    const y = 23 - Math.sin(index * 1.15 + offset) * 7 - (index % 3) * 1.4;
    return `${x},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox="0 0 118 34" className="h-8 w-[7.2rem]" aria-hidden>
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="8" x2="110" y1="27" y2="27" stroke="rgba(125,211,252,0.16)" />
    </svg>
  );
}

function HealthRing({
  value,
  label,
  subtitle,
  color = "#22d3ee",
}: {
  value: number;
  label: string;
  subtitle?: string;
  color?: string;
}) {
  const stroke = Math.max(0, Math.min(100, value)) * 2.9;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="14" />
          <circle cx="60" cy="60" r="46" fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${stroke} 290`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold text-ink">{value}</span>
          <span className="text-[11px] text-muted">{cleanDisplayCopy(label)}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{cleanDisplayCopy(subtitle ?? "状态良好")}</p>
        <div className="mt-3 space-y-2 text-xs text-muted">
          <div className="flex justify-between gap-2"><span>在线</span><span className="text-success">按筛选结果</span></div>
          <div className="flex justify-between gap-2"><span>校验</span><span className="text-warning">1</span></div>
          <div className="flex justify-between gap-2"><span>维护</span><span className="text-danger">1</span></div>
        </div>
      </div>
    </div>
  );
}

function ChannelSignalList({ channels, selectedId, onSelect }: { channels: SensorChannel[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-2">
      {channels.slice(0, 8).map((channel, index) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => onSelect(channel.id)}
          className={cn(
            "grid min-h-12 min-w-0 grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[5px] border px-2.5 py-2 text-left transition",
            selectedId === channel.id ? "border-cyan-200/60 bg-cyan-300/12 shadow-[0_0_18px_rgba(34,211,238,0.16)]" : "border-cyan-300/14 bg-[#03101f]/44 hover:border-cyan-300/40",
          )}
        >
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <HealthDot health={channel.health} />
              <span className="truncate text-sm font-medium text-ink">{cleanDisplayCopy(channel.name)}</span>
            </span>
            <span className="mt-1 block truncate text-[11px] text-muted">{channel.regionName}</span>
          </span>
          <span className="font-mono text-base font-semibold text-primary">{channel.latestValue}</span>
          <InlineSparkline color={signalColors[index % signalColors.length]} offset={index} />
        </button>
      ))}
    </div>
  );
}

function ChannelStatusGrid({ channels, selectedId, onSelect }: { channels: SensorChannel[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {channels.map((channel) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => onSelect(channel.id)}
          className={cn(
            "min-w-0 rounded-[5px] border px-2 py-2 text-left transition",
            selectedId === channel.id ? "border-cyan-200/70 bg-cyan-300/13" : "border-cyan-300/14 bg-[#03101f]/50 hover:border-cyan-300/42",
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-ink">{channel.id.replace("REAL-", "CH-")}</span>
            <HealthDot health={channel.health} />
          </span>
          <span className="mt-1 block truncate text-[11px] text-muted">{cleanDisplayCopy(channel.name)}</span>
          <span className="mt-2 flex items-end gap-1">
            <span className="font-mono text-lg font-semibold text-primary">{channel.latestValue}</span>
            <span className="pb-0.5 text-[10px] text-muted">{channel.unit}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ChannelTrendVisual({ selected, compareChannels }: { selected?: SensorChannel; compareChannels: SensorChannel[] }) {
  const channels = [selected, ...compareChannels.filter((channel) => channel.id !== selected?.id)].filter(Boolean).slice(0, 5) as SensorChannel[];
  const series = channels.map((channel, index) => ({
    channel,
    color: signalColors[index],
    points: getChannelTrendData(channel),
  }));
  const values = series.flatMap((item) => item.points.map((point) => point.value)).concat(series[0]?.points.map((point) => point.threshold) ?? [1]);
  const max = Math.max(...values) + 0.4;
  const min = Math.min(...values, 0);
  const scaleY = (value: number) => 248 - ((value - min) / Math.max(1, max - min)) * 172;
  const scaleX = (index: number) => 44 + index * 122;
  const selectedSeries = series[0];
  const threshold = selectedSeries?.points[0]?.threshold ?? 1.5;

  return (
    <div className="relative min-h-[350px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/76 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {series.map((item) => (
          <span key={item.channel.id} className="rounded-[4px] border border-cyan-300/18 bg-cyan-300/8 px-2 py-1 text-xs text-muted">
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.channel.name.split(" ")[0]}
          </span>
        ))}
        <span className="ml-auto rounded-[4px] border border-orange-300/24 bg-orange-400/10 px-2 py-1 text-xs text-orange-100">阈值线已标注</span>
      </div>
      <svg viewBox="0 0 720 290" className="h-[270px] w-full" role="img" aria-label="mock 多通道实时曲线">
        <defs>
          <linearGradient id="monitoring-line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="36" y="38" width="644" height="218" rx="8" fill="rgba(14,165,233,0.04)" stroke="rgba(56,189,248,0.18)" />
        <g stroke="rgba(125,211,252,0.12)" strokeWidth="1">
          {[74, 112, 150, 188, 226].map((y) => <line key={y} x1="44" x2="668" y1={y} y2={y} />)}
          {[44, 166, 288, 410, 532, 654].map((x) => <line key={x} x1={x} x2={x} y1="42" y2="252" />)}
        </g>
        <path
          d={`M${selectedSeries?.points.map((point, index) => `${scaleX(index)},${scaleY(point.value)}`).join(" L") ?? ""} L654 256 L44 256 Z`}
          fill="url(#monitoring-line-fill)"
        />
        <line x1="44" x2="668" y1={scaleY(threshold)} y2={scaleY(threshold)} stroke="#f59e0b" strokeDasharray="8 8" strokeOpacity="0.75" />
        <line x1="44" x2="668" y1={scaleY(threshold + 0.28)} y2={scaleY(threshold + 0.28)} stroke="#ef4444" strokeDasharray="8 8" strokeOpacity="0.75" />
        {series.map((item) => (
          <polyline
            key={item.channel.id}
            points={item.points.map((point, index) => `${scaleX(index)},${scaleY(point.value)}`).join(" ")}
            fill="none"
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={item.channel.id === selected?.id ? 3.2 : 2.4}
            opacity={item.channel.id === selected?.id ? 1 : 0.72}
          />
        ))}
        {selectedSeries ? (
          <g>
            <rect x="434" y="58" width="132" height="48" rx="6" fill="rgba(239,68,68,0.18)" stroke="rgba(248,113,113,0.45)" />
            <text x="450" y="80" fill="#fecaca" fontSize="13">短窗波动标注</text>
            <text x="450" y="98" fill="#fca5a5" fontSize="11">{selectedSeries.points[3].time} / {selectedSeries.points[3].value}</text>
            <circle cx={scaleX(3)} cy={scaleY(selectedSeries.points[3].value)} r="6" fill="#fb7185" />
          </g>
        ) : null}
        <g fill="#7dd3fc" fontSize="11" opacity="0.75">
          <text x="44" y="276">09:00</text>
          <text x="286" y="276">09:18</text>
          <text x="624" y="276">09:30</text>
        </g>
      </svg>
    </div>
  );
}

function CategoryDistribution() {
  const categories = Array.from(
    mockMonitoring.realChannels.reduce((map, channel) => {
      const category = channelCategory(channel);
      map.set(category, (map.get(category) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );

  return (
    <div className="grid gap-2">
      {categories.map(([category, count], index) => (
        <div key={category}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted">{category}</span>
            <span className="font-semibold text-ink">{count} 路</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.round((count / mockMonitoring.realChannels.length) * 100)}%`,
                backgroundColor: signalColors[index % signalColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelTopologyVisual({ selected }: { selected?: SensorChannel }) {
  const categories = ["瓦斯监测", "通风系统", "压力/应力", "环境参数", "地质扰动"];

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/76 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_42%,rgba(34,211,238,0.18),transparent_17rem),radial-gradient(circle_at_75%_62%,rgba(249,115,22,0.11),transparent_13rem)]" />
      <div className="relative grid min-h-[320px] gap-3 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-center rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-4 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
            <div>
              <p className="text-3xl font-semibold text-ink">{mockMonitoring.realChannels.length}</p>
              <p className="text-xs text-muted">演示通道</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">{selected?.name ?? "通道拓扑"}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{selected ? `${selected.regionName} / ${healthLabel[selected.health]}` : "按类型、区域、健康状态统一巡检"}</p>
        </div>
        <div className="grid gap-2">
          {categories.map((category, index) => {
            const channels = mockMonitoring.realChannels.filter((channel) => channelCategory(channel) === category);
            const online = channels.filter((channel) => channel.health === "online").length;
            return (
              <div key={category} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 rounded-[5px] border border-cyan-300/16 bg-cyan-300/7 px-3 py-2">
                <span className="truncate text-xs font-semibold text-ink">{category}</span>
                <div className="h-3 overflow-hidden rounded-full bg-cyan-300/10">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(8, (online / Math.max(1, channels.length)) * 100)}%`, backgroundColor: signalColors[index] }} />
                </div>
                <span className="text-xs text-muted">{online}/{channels.length}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChannelInventoryTable({ channels, selectedId, onSelect }: { channels: SensorChannel[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    channels.length ? (
      <div className="console-scrollbar min-w-0 max-w-full overflow-x-auto">
        <table className="min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {["通道", "通道名称", "类型", "所属区域", "状态", "最近更新", "校验状态", "维护责任", "操作"].map((label) => (
                <th key={label} className="whitespace-nowrap border-b border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs font-medium text-muted">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr
                key={channel.id}
                onClick={() => onSelect(channel.id)}
                className={cn("cursor-pointer transition hover:bg-cyan-300/7", selectedId === channel.id && "bg-cyan-300/10")}
              >
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs font-semibold text-primary">{channel.id}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-ink">{cleanDisplayCopy(channel.name)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{channelCategory(channel)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{cleanDisplayCopy(channel.regionName)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs"><StatusBadge tone={healthTone[channel.health]}>{healthLabel[channel.health]}</StatusBadge></td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{channel.latestSampleAt}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{cleanDisplayCopy(channel.calibrationStatus)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{cleanDisplayCopy(channel.maintainer)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2">
                  <div className="flex items-center gap-1">
                    {[Eye, LineChart, Settings].map((Icon, index) => (
                      <span key={index} className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-cyan-300/20 bg-cyan-300/8 text-primary">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <BoundaryNote>当前筛选条件下没有匹配通道，请调整区域或状态筛选。</BoundaryNote>
    )
  );
}

function WarningTrendVisual({ events }: { events: WarningEvent[] }) {
  const count = Math.max(1, events.length);
  const points = Array.from({ length: 16 }).map((_, index) => {
    const total = count + Math.round(Math.sin(index * 0.8) * 2 + index / 5);
    const high = events.filter((event) => event.riskLevel === "high" || event.riskLevel === "critical").length + (index % 3);
    const normal = Math.max(0, total - high);
    return { time: `${String((index + 8) % 24).padStart(2, "0")}:00`, total, high, normal };
  });
  const scaleX = (index: number) => 36 + index * 40;
  const scaleY = (value: number) => 210 - value * 14;

  return (
    <div className="relative min-h-[255px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/76 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">近24小时</StatusBadge>
        <StatusBadge tone="danger">一级/重大</StatusBadge>
        <StatusBadge tone="warning">二级/较大</StatusBadge>
      </div>
      <svg viewBox="0 0 680 240" className="h-[210px] w-full" role="img" aria-label="mock 预警事件趋势">
        <g stroke="rgba(125,211,252,0.12)" strokeWidth="1">
          {[54, 94, 134, 174, 214].map((y) => <line key={y} x1="34" x2="650" y1={y} y2={y} />)}
        </g>
        <polyline points={points.map((point, index) => `${scaleX(index)},${scaleY(point.total)}`).join(" ")} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points.map((point, index) => `${scaleX(index)},${scaleY(point.high)}`).join(" ")} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points.map((point, index) => `${scaleX(index)},${scaleY(point.normal)}`).join(" ")} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <g fill="#7dd3fc" fontSize="11" opacity="0.75">
          <text x="34" y="232">{points[0].time}</text>
          <text x="314" y="232">{points[7].time}</text>
          <text x="604" y="232">{points[15].time}</text>
        </g>
      </svg>
    </div>
  );
}

function WarningEventTable({ events, selectedId, onSelect }: { events: WarningEvent[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    events.length ? (
      <div className="console-scrollbar min-w-0 max-w-full overflow-x-auto">
        <table className="min-w-[880px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {["预警级别", "事件编号", "事件类型", "事件位置", "通道/传感器", "发生时间", "状态", "操作"].map((label) => (
                <th key={label} className="whitespace-nowrap border-b border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs font-medium text-muted">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.id}
                onClick={() => onSelect(event.id)}
                className={cn("cursor-pointer transition hover:bg-cyan-300/7", selectedId === event.id && "bg-cyan-300/10")}
              >
                <td className="border-b border-cyan-300/10 px-3 py-2"><RiskLevelBadge level={event.riskLevel} /></td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs font-semibold text-primary">{shortWarningId(event.id)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-ink">{eventType(event)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{cleanDisplayCopy(event.regionName)}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{event.relatedChannels.join(" / ")}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 text-xs text-muted">{event.eventTime}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2"><StatusBadge tone={handlingTone[event.status]}>{statusText[event.status]}</StatusBadge></td>
                <td className="border-b border-cyan-300/10 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/warning/events/${shortWarningId(event.id)}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-cyan-300/20 bg-cyan-300/8 text-primary"
                      aria-label="查看事件详情"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link
                      href={`/source-tracing/events/${shortWarningId(event.id)}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-cyan-300/20 bg-cyan-300/8 text-primary"
                      aria-label="进入溯源"
                    >
                      <LineChart className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <BoundaryNote>当前筛选条件下没有匹配事件，请调整风险等级、区域、状态或检索关键词。</BoundaryNote>
    )
  );
}

function ProcessingRail({ selected }: { selected?: WarningEvent }) {
  const steps = [
    { label: "预警触发", value: mockWarnings.events.length, tone: "danger" as StatusTone },
    { label: "分发通知", value: mockWarnings.events.length, tone: "warning" as StatusTone },
    { label: "响应确认", value: mockWarnings.events.filter((event) => event.status !== "pending").length, tone: "info" as StatusTone },
    { label: "现场处置", value: mockWarnings.events.filter((event) => event.status === "handling" || event.status === "reviewing" || event.status === "closed").length, tone: "info" as StatusTone },
    { label: "处置完成", value: mockWarnings.events.filter((event) => event.status === "closed").length, tone: "success" as StatusTone },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.label} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold", step.tone === "danger" && "border-red-300/50 bg-red-500/18 text-red-100", step.tone === "warning" && "border-amber-300/50 bg-amber-400/16 text-amber-100", step.tone === "info" && "border-cyan-300/45 bg-cyan-300/12 text-cyan-100", step.tone === "success" && "border-emerald-300/45 bg-emerald-400/12 text-emerald-100")}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{step.label}</p>
            <p className="truncate text-xs text-muted">{selected ? `${shortWarningId(selected.id)} 当前：${statusText[selected.status]}` : "筛选事件队列"}</p>
          </div>
          <span className="text-sm font-semibold text-primary">{step.value}</span>
        </div>
      ))}
    </div>
  );
}

function QuickLinks({ actions }: { actions: QuickActionItem[] }) {
  return (
    <section className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href ?? "#"}
          className="cockpit-chamfer-md group relative min-h-[82px] overflow-hidden rounded-[7px] border border-[var(--mine-border)] bg-[#061a31]/78 p-3 transition hover:border-cyan-300/55 hover:bg-cyan-300/10 hover:shadow-[0_0_22px_rgba(34,211,238,0.16)]"
        >
          <span className="absolute inset-x-3 top-0 h-px bg-cyan-200/50" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-cyan-300/28 bg-cyan-300/10 text-primary">
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

function RealtimeMonitoringPage({ meta, content }: MonitoringWorkstationPageProps) {
  const [region, setRegion] = useState("all");
  const [health, setHealth] = useState("all");
  const [selectedId, setSelectedId] = useState(mockMonitoring.realChannels[0]?.id ?? "");

  const filtered = useMemo(
    () => mockMonitoring.realChannels.filter((channel) => (region === "all" || channel.regionName === region) && (health === "all" || channel.health === health)),
    [region, health],
  );
  const selected = filtered.find((channel) => channel.id === selectedId) ?? filtered[0] ?? mockMonitoring.realChannels[0];
  const summary = getMonitoringSummary(filtered);
  const healthRate = Math.round((summary.online / Math.max(1, summary.total)) * 100);
  const regions = Array.from(new Set(mockMonitoring.realChannels.map((channel) => channel.regionName)));

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="信号采样 / 阈值曲线 / 异常复核" compactStatus="实时 mock 短窗">
      <WorkstationMetrics
        metrics={[
          { label: "筛选通道", value: String(filtered.length), unit: "路", hint: "区域与健康筛选联动", trend: "仅真实传感器", risk: "low", icon: iconNode(Activity), tone: "cyan", status: "真实" },
          { label: "在线通道", value: String(summary.online), unit: "路", hint: "当前筛选在线数", trend: `${healthRate}% 在线`, risk: "low", icon: iconNode(ShieldCheck), tone: "green", status: "在线" },
          { label: "需关注", value: String(summary.attention), unit: "路", hint: "校验或维护状态", trend: "需人工复核", risk: summary.attention ? "normal" : "low", icon: iconNode(AlertTriangle), tone: "amber", status: "关注" },
          { label: "选中通道", value: selected?.id ?? "无", hint: selected?.name ?? "未选中通道", trend: selected?.latestSampleAt ?? content.updatedAt, risk: selected?.health === "online" ? "low" : "normal", icon: iconNode(Gauge), tone: "blue", status: selected ? healthLabel[selected.health] : "无" },
        ]}
      />

      <FilterSurface>
        <ToolbarSelect label="区域" value={region} onChange={setRegion} options={[option("全部区域", "all"), ...regions.map((name) => option(name, name))]} />
        <ToolbarSelect
          label="健康状态"
          value={health}
          onChange={setHealth}
          options={[option("全部状态", "all"), option("在线", "online"), option("校验中", "calibrating"), option("维护中", "maintenance"), option("离线", "offline")]}
        />
        <StatusBadge tone="info">最新采样：{mockMonitoring.updatedAt}</StatusBadge>
        <StatusBadge tone="neutral">生成通道未混入</StatusBadge>
      </FilterSurface>

      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="关键气体实时值" badge={`${filtered.length} 路`} tone="info">
              <ChannelSignalList channels={filtered} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="异常波动提示" badge="复核队列" tone="warning">
              <DenseList
                items={mockMonitoring.abnormalFluctuations.map((item) => ({
                  label: item.title,
                  value: item.time,
                  meta: item.description,
                  tone: item.tone ?? "warning",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="多通道实时波形"
            description="中心主视觉按真实传感器通道绘制 mock 短窗趋势，橙/红虚线表达预警与危险阈值。"
            modeLabel="采样窗口"
            modes={["实时", "1分钟", "5分钟", "15分钟", "1小时"]}
            activeMode="1分钟"
            legend={[
              { label: "当前通道", value: selected?.id, tone: "info" },
              { label: "预警阈值", tone: "warning" },
              { label: "危险阈值", tone: "danger" },
            ]}
          >
            <ChannelTrendVisual selected={selected} compareChannels={filtered.slice(0, 5)} />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="设备健康度" badge={`${healthRate}分`} tone="success">
              <HealthRing value={healthRate} label="健康度" subtitle="按筛选结果计算" color="#10b981" />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="最新异常点位" badge="事件联动" tone="warning" moreHref="/warning/events">
              <DenseList
                items={mockWarnings.events.map((event) => ({
                  label: event.regionName,
                  value: shortWarningId(event.id),
                  meta: `${event.summary} / ${event.relatedChannels.join(", ")}`,
                  risk: event.riskLevel,
                  href: `/warning/events/${shortWarningId(event.id)}`,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="快速筛选" badge="只读" tone="info">
              <div className="grid grid-cols-2 gap-2">
                {["瓦斯 CH4", "一氧化碳 CO", "风速", "温湿度", "粉尘", "压力/应力"].map((label) => (
                  <button key={label} type="button" className="min-h-10 rounded-[5px] border border-cyan-300/18 bg-cyan-300/8 px-2 text-xs text-muted transition hover:border-cyan-300/45 hover:text-ink">
                    {label}
                  </button>
                ))}
              </div>
            </CockpitSectionPanel>
          </>
        )}
      />

      <CockpitSectionPanel title="通道健康状态矩阵" badge="真实传感器" tone="info">
        <ChannelStatusGrid channels={filtered} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
      </CockpitSectionPanel>

      <CockpitBottomTicker
        level={mockWarnings.events[0].riskLevel}
        summary={`${mockWarnings.events[0].summary} 当前选中 ${selected?.id ?? "无"}，请结合现场复核。`}
        area={`${mockWarnings.events[0].regionName} / ${mockWarnings.events[0].relatedChannels.join(", ")}`}
        href="/warning/events"
        updatedAt={content.updatedAt}
      />

      <BoundaryNote>mock 边界：本页不连接真实 WebSocket、MQTT、SSE 或生产监测接口；所有曲线、阈值与波动均为前端演示数据。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function ChannelManagementPage({ meta, content }: MonitoringWorkstationPageProps) {
  const [region, setRegion] = useState("all");
  const [health, setHealth] = useState("all");
  const [selectedId, setSelectedId] = useState(mockMonitoring.realChannels[0]?.id ?? "");
  const regions = Array.from(new Set(mockMonitoring.realChannels.map((channel) => channel.regionName)));
  const filtered = useMemo(
    () => mockMonitoring.realChannels.filter((channel) => (region === "all" || channel.regionName === region) && (health === "all" || channel.health === health)),
    [region, health],
  );
  const selected = filtered.find((channel) => channel.id === selectedId) ?? filtered[0] ?? mockMonitoring.realChannels[0];
  const summary = getMonitoringSummary(mockMonitoring.realChannels);
  const healthRate = Math.round((summary.online / summary.total) * 100);
  const calibrationCount = mockMonitoring.realChannels.filter((channel) => channel.health === "calibrating").length;
  const maintenanceCount = mockMonitoring.realChannels.filter((channel) => channel.health === "maintenance").length;

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="设备台账 / 校验状态 / 维护责任" compactStatus="通道巡检 mock">
      <WorkstationMetrics
        metrics={[
          { label: "真实通道总数", value: String(mockMonitoring.realChannels.length), unit: "路", hint: "统一设备台账", trend: "不含生成通道", risk: "low", icon: iconNode(Activity), tone: "cyan", status: "真实" },
          { label: "正常通道", value: String(summary.online), unit: "路", hint: "在线且校验有效", trend: `${healthRate}% 在线`, risk: "low", icon: iconNode(CheckCircle2), tone: "green", status: "正常" },
          { label: "待校验", value: String(calibrationCount), unit: "路", hint: "校验中或待复核", trend: "只读展示", risk: calibrationCount ? "normal" : "low", icon: iconNode(Wrench), tone: "amber", status: "校验" },
          { label: "维护中", value: String(maintenanceCount), unit: "路", hint: "不执行真实启停", trend: "需维护记录", risk: maintenanceCount ? "normal" : "low", icon: iconNode(Settings), tone: "red", status: "维护" },
        ]}
      />

      <FilterSurface>
        <ToolbarSelect label="所属区域" value={region} onChange={setRegion} options={[option("全部区域", "all"), ...regions.map((name) => option(name, name))]} />
        <ToolbarSelect
          label="在线状态"
          value={health}
          onChange={setHealth}
          options={[option("全部状态", "all"), option("在线", "online"), option("校验中", "calibrating"), option("维护中", "maintenance"), option("离线", "offline")]}
        />
        <StatusBadge tone="neutral">表格行可点击联动详情</StatusBadge>
      </FilterSurface>

      <WorkstationColumns
        left={(
          <>
            <CockpitSectionPanel title="设备-通道健康度" badge={`${healthRate}分`} tone="success">
              <HealthRing value={healthRate} label="健康度" subtitle="按筛选结果计算" color="#10b981" />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="校准状态" badge="巡检" tone="warning">
              <DenseList
                items={[
                  { label: "已校准", value: `${summary.online} 路`, meta: "最近校验有效", tone: "success" },
                  { label: "待校准", value: `${calibrationCount} 路`, meta: "需人工复核", tone: "warning" },
                  { label: "维护中", value: `${maintenanceCount} 路`, meta: "仅展示维护状态", tone: "danger" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="通道拓扑 / 分类分布"
            description="用类型、区域、健康度重新组织设备台账，帮助先定位问题通道，再进入维护记录。"
            modeLabel="管理视图"
            modes={["拓扑", "台账", "校验", "维护"]}
            activeMode="拓扑"
            legend={[
              { label: "在线", value: String(summary.online), tone: "success" },
              { label: "校验/维护", value: String(summary.attention), tone: "warning" },
            ]}
          >
            <ChannelTopologyVisual selected={selected} />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="传感器类型分布" badge={`${mockMonitoring.realChannels.length} 路`} tone="info">
              <CategoryDistribution />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="问题通道 Top" badge="巡检" tone="warning">
              <DenseList
                items={mockMonitoring.realChannels.filter((channel) => channel.health !== "online").map((channel) => ({
                  label: channel.name,
                  value: healthLabel[channel.health],
                  meta: `${channel.regionName} / ${channel.calibrationStatus} / ${channel.maintainer}`,
                  tone: healthTone[channel.health],
                }))}
              />
            </CockpitSectionPanel>
            <BoundaryNote>通道管理只展示设备状态、校验状态与维护责任，不提供真实启停、删除、校准或写入配置能力。</BoundaryNote>
          </>
        )}
      />

      <CockpitSectionPanel title="关键通道清单" badge={`${filtered.length} 条`} tone="info" contentClassName="p-0">
        <ChannelInventoryTable channels={filtered} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
      </CockpitSectionPanel>

      <QuickLinks
        actions={[
          { label: "实时监测", href: "/monitoring/realtime", description: "查看曲线与采样", status: "曲线", icon: iconNode(LineChart) },
          { label: "预警事件", href: "/warning/events", description: "查看关联事件", status: "事件", icon: iconNode(Bell) },
          { label: "通道配置", href: "/monitoring/channels", description: "设备状态与校验", status: "只读", icon: iconNode(Settings) },
          { label: "监测概览", href: "/monitoring", description: "返回模块总览", status: "总览", icon: iconNode(Gauge) },
        ]}
      />
    </CockpitPageFrame>
  );
}

function WarningEventsPage({ meta, content }: MonitoringWorkstationPageProps) {
  const [risk, setRisk] = useState("all");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(mockWarnings.events[0]?.id ?? "");
  const regions = Array.from(new Set(mockWarnings.events.map((event) => event.regionName)));
  const filtered = useMemo(
    () => mockWarnings.events.filter((event) => {
      const matchesQuery = !query.trim() || `${event.id} ${event.summary} ${event.regionName} ${event.relatedChannels.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
      return (risk === "all" || event.riskLevel === risk) && (region === "all" || event.regionName === region) && (status === "all" || event.status === status) && matchesQuery;
    }),
    [query, region, risk, status],
  );
  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0] ?? mockWarnings.events[0];
  const highRiskCount = filtered.filter((event) => event.riskLevel === "high" || event.riskLevel === "critical").length;
  const openCount = filtered.filter((event) => event.status !== "closed").length;
  const levelData = getWarningLevelData(filtered);

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="事件筛选 / 分诊处置 / 溯源入口" compactStatus="事件 mock 队列">
      <WorkstationMetrics
        metrics={[
          { label: "筛选事件", value: String(filtered.length), unit: "条", hint: "等级、区域、状态、关键词联动", trend: "当前结果", risk: "normal", icon: iconNode(Bell), tone: "cyan", status: "事件" },
          { label: "较大及以上", value: String(highRiskCount), unit: "条", hint: "需重点复核", trend: "风险四色", risk: highRiskCount ? "high" : "low", icon: iconNode(AlertTriangle), tone: "red", status: "高风险" },
          { label: "待处置", value: String(openCount), unit: "条", hint: "未销号事件", trend: "只读状态", risk: openCount ? "normal" : "low", icon: iconNode(ClipboardCheck), tone: "amber", status: "处置" },
          { label: "当前事件", value: selected ? shortWarningId(selected.id) : "无", hint: selected?.owner ?? "未选中事件", trend: selected ? statusText[selected.status] : "无", risk: selected?.riskLevel ?? "low", icon: iconNode(Radio), tone: "blue", status: selected ? riskLevelText[selected.riskLevel] : "无" },
        ]}
      />

      <FilterSurface>
        <ToolbarSelect label="风险等级" value={risk} onChange={setRisk} options={[option("全部等级", "all"), ...Object.entries(riskLabel).map(([value, label]) => option(label, value))]} />
        <ToolbarSelect label="区域" value={region} onChange={setRegion} options={[option("全部区域", "all"), ...regions.map((name) => option(name, name))]} />
        <ToolbarSelect label="处置状态" value={status} onChange={setStatus} options={[option("全部状态", "all"), ...Object.entries(statusText).map(([value, label]) => option(label, value))]} />
        <SearchField value={query} onChange={setQuery} placeholder="事件ID / 位置 / 通道" />
      </FilterSurface>

      <WorkstationColumns
        className="xl:grid-cols-[minmax(250px,0.82fr)_minmax(0,1.82fr)_minmax(250px,0.86fr)]"
        left={(
          <>
            <CockpitSectionPanel title="预警类型统计" badge="今日" tone="warning">
              <DenseList
                items={Array.from(new Set(filtered.map(eventType))).map((type) => ({
                  label: type,
                  value: `${filtered.filter((event) => eventType(event) === type).length} 条`,
                  meta: "按事件摘要归类的 mock 统计",
                  tone: "warning",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="区域预警热点" badge="Top" tone="danger">
              <DenseList
                items={regions.map((name) => ({
                  label: name,
                  value: `${filtered.filter((event) => event.regionName === name).length} 条`,
                  meta: "区域事件筛选结果",
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="响应效率" badge="mock" tone="success">
              <HealthRing value={82} label="处置率" subtitle="按演示事件状态估算" color="#22d3ee" />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="预警事件趋势与分诊表"
            description="中心区域先看事件趋势，再在下方表格完成筛选、选择、详情与溯源入口定位。"
            modeLabel="统计窗口"
            modes={["近24小时", "近7天", "近30天"]}
            activeMode="近24小时"
            legend={[
              { label: "预警总数", value: String(filtered.length), tone: "info" },
              { label: "一级/重大", value: String(filtered.filter((event) => event.riskLevel === "critical").length), tone: "danger" },
              { label: "二级/较大", value: String(filtered.filter((event) => event.riskLevel === "high").length), tone: "warning" },
            ]}
          >
            <div className="grid gap-3">
              <WarningTrendVisual events={filtered} />
              <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58">
                <WarningEventTable events={filtered} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
              </div>
            </div>
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="预警级别分布" badge={`${filtered.length} 条`} tone="danger">
              <DenseList
                items={levelData.map((item) => ({
                  label: item.name,
                  value: `${item.count} 条`,
                  meta: "风险四色统一表达",
                  risk: item.level as RiskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="当前预警处理概览" badge={selected ? shortWarningId(selected.id) : "无"} tone={selected ? riskTone[selected.riskLevel] : "neutral"}>
              <DenseList
                items={selected ? [
                  { label: "事件摘要", value: riskLevelText[selected.riskLevel], meta: selected.summary, risk: selected.riskLevel },
                  { label: "关联通道", value: `${selected.relatedChannels.length} 路`, meta: selected.relatedChannels.join(" / "), tone: "info" },
                  { label: "责任人", value: selected.owner, meta: `${selected.eventTime} / ${statusText[selected.status]}`, tone: handlingTone[selected.status] },
                ] : []}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="预警处置流程" badge="五步" tone="info">
              <ProcessingRail selected={selected} />
            </CockpitSectionPanel>
          </>
        )}
      />

      <QuickLinks
        actions={[
          { label: "事件详情", href: selected ? `/warning/events/${shortWarningId(selected.id)}` : "/warning/events/W001", description: "查看基础信息与处置记录", status: "详情", icon: iconNode(Eye) },
          { label: "溯源研判", href: selected ? `/source-tracing/events/${shortWarningId(selected.id)}` : "/source-tracing/events/W001", description: "查看辅助解释链路", status: "溯源", icon: iconNode(LineChart) },
          { label: "实时监测", href: "/monitoring/realtime", description: "回看关联曲线", status: "曲线", icon: iconNode(Activity) },
          { label: "预警概览", href: "/warning", description: "返回统计入口", status: "概览", icon: iconNode(BarChart3) },
        ]}
      />

      <CockpitBottomTicker
        level={selected?.riskLevel ?? "normal"}
        summary={selected ? `${selected.summary} 当前状态：${statusText[selected.status]}，不触发真实通知。` : "当前筛选无事件。"}
        area={selected ? `${selected.regionName} / ${selected.relatedChannels.join(", ")}` : "筛选结果"}
        href={selected ? `/warning/events/${shortWarningId(selected.id)}` : "/warning/events"}
        updatedAt={content.updatedAt}
        autoRefresh="mock 队列刷新"
      />

      <BoundaryNote>mock 边界：本页不修改真实事件状态，不发送短信、电话、企业微信或邮件通知；溯源入口只进入辅助研判展示。</BoundaryNote>
    </CockpitPageFrame>
  );
}

export function MonitoringWorkstationPage(props: MonitoringWorkstationPageProps) {
  switch (props.content.path) {
    case "/monitoring/realtime":
      return <RealtimeMonitoringPage {...props} />;
    case "/monitoring/channels":
      return <ChannelManagementPage {...props} />;
    case "/warning/events":
      return <WarningEventsPage {...props} />;
    default:
      return null;
  }
}
