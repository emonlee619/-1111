"use client";

import { useEffect, useMemo, useState } from "react";
import { CockpitBottomTicker, CockpitMetricCard, CockpitPageFrame, CockpitSectionPanel } from "@/components/cockpit";
import { DataTableShell } from "@/components/ui/BusinessSections";
import { businessPageByPath } from "@/data/businessPages";
import { mockTwin } from "@/data/mockTwin";
import { twinRiskMarkers } from "@/data/twinTunnelScene";
import { routeMetaByPath } from "@/config/routeMeta";
import { fetchOutburstStats, fetchOutburstWarnings, type OutburstStats, type OutburstWarning } from "@/lib/outburstApi";
import type { CockpitMetricView } from "@/types/cockpit";
import type { RiskLevel } from "@/types/risk";

type State = {
  online: boolean;
  stats?: OutburstStats;
  warnings: OutburstWarning[];
};

function value(input: unknown, fallback = "-") {
  if (input === undefined || input === null || input === "") return fallback;
  if (typeof input === "number") return input.toLocaleString();
  return String(input);
}

function useTwinRiskData() {
  const [state, setState] = useState<State>({ online: false, warnings: [] });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [stats, warnings] = await Promise.all([fetchOutburstStats(), fetchOutburstWarnings(60)]);
        if (!cancelled) setState({ online: true, stats, warnings });
      } catch {
        if (!cancelled) setState({ online: false, warnings: [] });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function TwinRiskHeatmapPage() {
  const meta = routeMetaByPath["/twin/risk-heatmap"];
  const content = businessPageByPath["/twin/risk-heatmap"];
  const state = useTwinRiskData();
  const latest = state.warnings[0];
  const highCount = state.warnings.filter((item) => item.risk_level_code === "high" || item.risk_level_code === "critical").length;

  const metrics = useMemo<CockpitMetricView[]>(() => [
    { label: "热力区域", value: String(mockTwin.heatmapCells.length), hint: "空间网格", trend: "保留数字孪生 UI", risk: "normal", tone: "cyan", status: "空间" },
    { label: "后端事件", value: value(state.stats?.warning_count ?? state.warnings.length), unit: "条", hint: "warning_results", trend: state.online ? "已接入" : "fallback", risk: highCount ? "high" : "low", tone: "red", status: state.online ? "后端" : "mock" },
    { label: "高风险", value: String(highCount), unit: "条", hint: "较大及以上", trend: latest?.event_id ?? "暂无", risk: highCount ? "high" : "low", tone: "amber", status: "台账" },
    { label: "3D 标记", value: String(twinRiskMarkers.length), unit: "处", hint: "模型风险锚点", trend: "进入巷道态势查看", risk: "normal", tone: "blue", status: "孪生" },
  ], [highCount, latest, state]);

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="空间热力 + 63节点事件数据层" compactStatus={state.online ? "/api/outburst/warnings" : "mock fallback"}>
      <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <CockpitMetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <CockpitSectionPanel title="风险热力图" badge="空间 UI" tone="info" moreHref="/twin/tunnel" contentClassName="min-h-[420px]">
          <div className="relative min-h-[390px] overflow-hidden rounded-[6px] border border-cyan-300/18 bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.2),transparent_18rem),linear-gradient(135deg,#041225,#020815)]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:46px_46px]" />
            {mockTwin.heatmapCells.map((cell, index) => {
              const x = 12 + (index % 3) * 28;
              const y = 18 + Math.floor(index / 3) * 34;
              const backendActive = latest?.risk_level_code === "high" || latest?.risk_level_code === "critical";
              const color = cell.riskLevel === "critical" || (backendActive && index === 0) ? "bg-red-400/70 border-red-200" : cell.riskLevel === "high" ? "bg-orange-400/60 border-orange-200" : cell.riskLevel === "normal" ? "bg-amber-300/45 border-amber-100" : "bg-emerald-300/40 border-emerald-100";
              return (
                <div
                  key={cell.id}
                  className={`absolute h-24 w-32 rounded-[8px] border ${color} p-3 shadow-[0_0_28px_rgba(34,211,238,0.18)] backdrop-blur-sm`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <p className="text-xs font-semibold text-slate-950">{cell.regionName}</p>
                  <p className="mt-1 text-[11px] text-slate-950/80">{cell.riskPoint}</p>
                </div>
              );
            })}
          </div>
        </CockpitSectionPanel>

        <CockpitSectionPanel title="后端事件叠加" badge={latest?.event_id ?? "fallback"} tone={highCount ? "warning" : "info"}>
          <DataTableShell
            columns={[
              { key: "id", label: "事件" },
              { key: "risk", label: "等级" },
              { key: "combined", label: "综合" },
              { key: "time", label: "时间" },
            ]}
            rows={(state.warnings.length ? state.warnings : []).slice(0, 8).map((item) => ({
              id: item.event_id,
              risk: item.risk_level,
              combined: item.combined_risk.toFixed(3),
              time: item.timestamp,
            }))}
          />
        </CockpitSectionPanel>
      </div>

      <CockpitBottomTicker
        level={(latest?.risk_level_code ?? "normal") as RiskLevel}
        summary={latest?.summary ?? "后端不可用时保留数字孪生 mock 热力，不回退到接口列表页。"}
        area={latest ? `${latest.event_id} / ${latest.risk_level}` : "数字孪生热力"}
        href={latest ? `/warning/events/${latest.event_id}` : "/warning/events"}
        updatedAt={state.stats?.latest_warning ?? content.updatedAt}
        autoRefresh="63节点事件数据层"
      />
    </CockpitPageFrame>
  );
}
