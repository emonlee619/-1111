"use client";

import { useEffect, useMemo, useState } from "react";
import { CockpitBottomTicker, CockpitMetricCard, CockpitPageFrame, CockpitSectionPanel } from "@/components/cockpit";
import { DataTableShell } from "@/components/ui/BusinessSections";
import { businessPageByPath } from "@/data/businessPages";
import { mockTwin } from "@/data/mockTwin";
import { twinSensorPoints } from "@/data/twinTunnelScene";
import { routeMetaByPath } from "@/config/routeMeta";
import { fetchOutburstSensors, fetchOutburstStats, type OutburstSensorMeta, type OutburstStats } from "@/lib/outburstApi";
import type { CockpitMetricView } from "@/types/cockpit";

type State = {
  online: boolean;
  stats?: OutburstStats;
  sensors: OutburstSensorMeta[];
};

function value(input: unknown, fallback = "-") {
  if (input === undefined || input === null || input === "") return fallback;
  if (typeof input === "number") return input.toLocaleString();
  return String(input);
}

function useTwinSensorsData() {
  const [state, setState] = useState<State>({ online: false, sensors: [] });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [stats, sensors] = await Promise.all([fetchOutburstStats(), fetchOutburstSensors()]);
        if (!cancelled) setState({ online: true, stats, sensors });
      } catch {
        if (!cancelled) setState({ online: false, sensors: [] });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function TwinSensorsPage() {
  const meta = routeMetaByPath["/twin/sensors"];
  const content = businessPageByPath["/twin/sensors"];
  const state = useTwinSensorsData();
  const latest = state.sensors[0];
  const onlineAnchors = twinSensorPoints.filter((item) => item.status === "online").length;

  const metrics = useMemo<CockpitMetricView[]>(() => [
    { label: "孪生锚点", value: String(twinSensorPoints.length), unit: "处", hint: "3D 空间点位", trend: `${onlineAnchors} 处在线`, risk: "low", tone: "cyan", status: "空间" },
    { label: "63 节点", value: value(state.stats?.meta_count ?? state.sensors.length), unit: "项", hint: "后端最新值", trend: state.online ? "已接入" : "fallback", risk: "low", tone: "green", status: state.online ? "后端" : "mock" },
    { label: "动态样本", value: value(state.stats?.dynamic_sensor_count), unit: "行", hint: "SQLite 聚合", trend: state.stats?.latest_dynamic_data ?? "等待连接", risk: "normal", tone: "blue", status: "数据" },
    { label: "最新节点", value: latest?.sensor_id ?? "待连接", hint: latest?.indicator_name ?? "后端不可用时保留空间 UI", trend: value(latest?.value), risk: "normal", tone: "amber", status: "latest" },
  ], [latest, onlineAnchors, state]);

  return (
    <CockpitPageFrame meta={meta} content={content} kicker="点位空间 UI + 63节点最新值" compactStatus={state.online ? "/api/outburst/sensors/latest" : "mock fallback"}>
      <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <CockpitMetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
        <CockpitSectionPanel title="空间点位分布" badge="孪生 UI" tone="info" moreHref="/twin/tunnel" contentClassName="min-h-[420px]">
          <div className="relative min-h-[390px] overflow-hidden rounded-[6px] border border-cyan-300/18 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.2),transparent_17rem),linear-gradient(160deg,#041225,#020815)]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.06)_1px,transparent_1px)] bg-[length:42px_42px]" />
            {mockTwin.sensorPoints.map((point, index) => {
              const x = 14 + (index % 4) * 21;
              const y = 18 + Math.floor(index / 4) * 25;
              const backend = state.sensors[index % Math.max(state.sensors.length, 1)];
              return (
                <div key={point.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                  <span className="block h-4 w-4 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
                  <div className="mt-2 w-32 rounded-[5px] border border-cyan-300/20 bg-[#03101f]/78 p-2 text-xs backdrop-blur">
                    <p className="truncate font-semibold text-ink">{backend?.sensor_id ?? point.id}</p>
                    <p className="mt-1 truncate text-muted">{backend?.indicator_name ?? point.name}</p>
                    <p className="mt-1 text-primary">{value(backend?.value, point.health)} {backend?.unit ?? ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CockpitSectionPanel>

        <CockpitSectionPanel title="63 节点最新值" badge={`${state.sensors.length || 0} 项`} tone={state.online ? "info" : "warning"}>
          <DataTableShell
            columns={[
              { key: "id", label: "节点" },
              { key: "name", label: "指标" },
              { key: "position", label: "空间位置" },
              { key: "value", label: "最新值" },
              { key: "time", label: "时间" },
            ]}
            rows={(state.sensors.length ? state.sensors : []).slice(0, 12).map((sensor) => ({
              id: sensor.sensor_id,
              name: sensor.indicator_name ?? sensor.sensor_type ?? "-",
              position: sensor.spatial_position ?? "-",
              value: sensor.value ?? null,
              time: sensor.timestamp ?? "-",
            }))}
          />
        </CockpitSectionPanel>
      </div>

      <CockpitBottomTicker
        level="normal"
        summary={latest ? `${latest.sensor_id} 最新值 ${value(latest.value)} ${latest.unit ?? ""}` : "后端不可用时保留数字孪生点位 mock，不回退到接口列表页。"}
        area="数字孪生传感器点位"
        href="/data/features"
        updatedAt={state.stats?.latest_dynamic_data ?? content.updatedAt}
        autoRefresh="63节点最新值"
      />
    </CockpitPageFrame>
  );
}
