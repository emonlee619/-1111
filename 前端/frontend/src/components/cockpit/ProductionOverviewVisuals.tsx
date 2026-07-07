import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type {
  HazardLedgerItem,
  MeasureLibraryItem,
  MineProductionArea,
  MineProductionPoint,
  MineVentilationFlow,
  MonitoringTrendChannel,
  RiskMapCell,
  SensorChannel,
  WorkflowStep,
} from "@/types/business";
import type { RiskLevel, StatusTone } from "@/types/risk";

const riskVisual: Record<RiskLevel, { fill: string; stroke: string; bg: string; text: string; ring: string }> = {
  low: {
    fill: "#38bdf8",
    stroke: "rgba(56,189,248,0.78)",
    bg: "border-sky-300/35 bg-sky-400/12",
    text: "text-sky-100",
    ring: "shadow-[0_0_18px_rgba(56,189,248,0.22)]",
  },
  normal: {
    fill: "#facc15",
    stroke: "rgba(250,204,21,0.78)",
    bg: "border-yellow-300/38 bg-yellow-400/14",
    text: "text-yellow-100",
    ring: "shadow-[0_0_18px_rgba(250,204,21,0.18)]",
  },
  high: {
    fill: "#fb923c",
    stroke: "rgba(251,146,60,0.82)",
    bg: "border-orange-300/45 bg-orange-400/16",
    text: "text-orange-100",
    ring: "shadow-[0_0_22px_rgba(251,146,60,0.2)]",
  },
  critical: {
    fill: "#f87171",
    stroke: "rgba(248,113,113,0.86)",
    bg: "border-red-300/45 bg-red-500/16",
    text: "text-red-100",
    ring: "shadow-[0_0_24px_rgba(248,113,113,0.22)]",
  },
};

const riskName: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般风险",
  high: "较大风险",
  critical: "重大风险",
};

const healthTone: Record<string, StatusTone> = {
  online: "success",
  calibrating: "warning",
  maintenance: "warning",
  offline: "danger",
};

function pctX(value: number) {
  return value * 9;
}

function pctY(value: number) {
  return value * 4.6;
}

function tunnelPath(areas: MineProductionArea[]) {
  return areas.map((area, index) => `${index === 0 ? "M" : "L"} ${pctX(area.x)} ${pctY(area.y)}`).join(" ");
}

function svgPointLine(channel: MonitoringTrendChannel, rowIndex: number) {
  const left = 118;
  const width = 630;
  const rowTop = 42 + rowIndex * 43;
  const laneHeight = 29;
  const values = channel.samples.map((sample) => sample.value);
  const maxValue = Math.max(channel.criticalThreshold ?? channel.threshold * 1.18, channel.threshold, ...values);
  const rawMin = Math.min(...values);
  const minValue = rawMin > 0 ? rawMin * 0.78 : 0;
  const range = Math.max(maxValue - minValue, 0.01);

  return channel.samples
    .map((sample, index) => {
      const x = left + (index * width) / Math.max(channel.samples.length - 1, 1);
      const y = rowTop + laneHeight - ((sample.value - minValue) / range) * laneHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function thresholdY(channel: MonitoringTrendChannel, rowIndex: number) {
  const rowTop = 42 + rowIndex * 43;
  const laneHeight = 29;
  const values = channel.samples.map((sample) => sample.value);
  const maxValue = Math.max(channel.criticalThreshold ?? channel.threshold * 1.18, channel.threshold, ...values);
  const rawMin = Math.min(...values);
  const minValue = rawMin > 0 ? rawMin * 0.78 : 0;
  const range = Math.max(maxValue - minValue, 0.01);
  return rowTop + laneHeight - ((channel.threshold - minValue) / range) * laneHeight;
}

function MiniStatusCard({
  label,
  value,
  meta,
  tone = "info",
}: {
  label: string;
  value: string;
  meta: string;
  tone?: StatusTone;
}) {
  return (
    <div className="min-w-0 rounded-[5px] border border-cyan-300/16 bg-[#03101f]/62 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted">{label}</span>
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </div>
      <p className="mt-1 truncate text-[11px] text-muted">{meta}</p>
    </div>
  );
}

export function DashboardMineSituationVisual({
  areas,
  points,
  flows,
}: {
  areas: MineProductionArea[];
  points: MineProductionPoint[];
  flows: MineVentilationFlow[];
}) {
  const visiblePointLabels = points.filter((point) => point.riskLevel === "high" || point.riskLevel === "critical");
  const labelOffsets: Record<string, string> = {
    "P-CH4-03": "translate(-114%, -138%)",
    "P-G07": "translate(10%, -126%)",
    "P-DUST-01": "translate(-120%, -8%)",
  };
  const areaOffsets: Record<string, string> = {
    "AREA-RETURN": "translate(-40%, 62%)",
    "AREA-FACE": "translate(12%, 24%)",
    "AREA-MID": "translate(-78%, -20%)",
    "AREA-WIND": "translate(-84%, 56%)",
  };

  return (
    <div className="relative min-h-[324px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/78">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_38%,rgba(34,211,238,0.2),transparent_17rem),radial-gradient(circle_at_70%_44%,rgba(248,113,113,0.13),transparent_12rem)]" />
      <svg viewBox="0 0 900 460" className="absolute inset-0 h-full w-full" role="img" aria-label="mock 矿井巷道态势、通风流向和传感器点位">
        <defs>
          <filter id="dashboard-production-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="dashboard-tunnel-production" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="48%" stopColor="#22d3ee" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.36" />
          </linearGradient>
          <marker id="dashboard-flow-arrow" markerHeight="10" markerWidth="10" orient="auto" refX="8" refY="3">
            <path d="M0,0 L8,3 L0,6 Z" fill="#67e8f9" opacity="0.82" />
          </marker>
        </defs>
        <g stroke="rgba(125,211,252,0.11)" strokeWidth="1">
          {Array.from({ length: 13 }).map((_, index) => (
            <line key={`dashboard-grid-x-${index}`} x1={index * 82} y1="0" x2={index * 82 - 120} y2="460" />
          ))}
          {Array.from({ length: 8 }).map((_, index) => (
            <line key={`dashboard-grid-y-${index}`} x1="0" y1={index * 64} x2="900" y2={index * 64 - 44} />
          ))}
        </g>
        <g filter="url(#dashboard-production-glow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={tunnelPath(areas)} stroke="url(#dashboard-tunnel-production)" strokeWidth="8" />
          <path d="M210 338 C308 312 350 292 480 284 S650 292 782 238" stroke="rgba(34,211,238,0.54)" strokeWidth="5" />
          <path d="M320 180 C378 232 422 248 482 304 S582 382 696 356" stroke="rgba(56,189,248,0.38)" strokeWidth="4" />
          <path d="M456 188 L506 120 L594 150" stroke="rgba(125,211,252,0.36)" strokeWidth="3" />
          <path d="M486 250 L422 356 L330 384" stroke="rgba(125,211,252,0.3)" strokeWidth="3" />
          {flows.map((flow) => (
            <path
              key={flow.id}
              d={`M ${pctX(flow.x1)} ${pctY(flow.y1)} C ${(pctX(flow.x1) + pctX(flow.x2)) / 2} ${pctY(flow.y1) - 34} ${(pctX(flow.x1) + pctX(flow.x2)) / 2} ${pctY(flow.y2) + 34} ${pctX(flow.x2)} ${pctY(flow.y2)}`}
              stroke="rgba(103,232,249,0.72)"
              strokeDasharray={flow.status === "稳定" ? undefined : "10 8"}
              strokeWidth="2.5"
              markerEnd="url(#dashboard-flow-arrow)"
            />
          ))}
        </g>
        <g filter="url(#dashboard-production-glow)">
          {areas.map((area) => (
            <circle key={`area-${area.id}`} cx={pctX(area.x)} cy={pctY(area.y)} r="14" fill="none" stroke={riskVisual[area.riskLevel].stroke} strokeOpacity="0.32" />
          ))}
          {points.map((point) => (
            <g key={point.id}>
              <circle cx={pctX(point.x)} cy={pctY(point.y)} r={point.riskLevel === "critical" ? 10 : 8} fill={riskVisual[point.riskLevel].fill} opacity="0.96" />
              <circle cx={pctX(point.x)} cy={pctY(point.y)} r={point.riskLevel === "low" ? 17 : 23} fill="none" stroke={riskVisual[point.riskLevel].stroke} strokeOpacity="0.4" strokeWidth="2" />
            </g>
          ))}
        </g>
      </svg>
      {areas.map((area) => (
        <div
          key={area.id}
          className={cn("absolute max-w-[9.6rem] rounded-[5px] border px-2.5 py-1.5 text-xs backdrop-blur-sm", riskVisual[area.riskLevel].bg, riskVisual[area.riskLevel].text, riskVisual[area.riskLevel].ring)}
          style={{ left: `${area.x}%`, top: `${area.y}%`, transform: areaOffsets[area.id] ?? "translate(-50%, -50%)" }}
        >
          <p className="truncate font-semibold">{area.label}</p>
          <p className="mt-0.5 truncate opacity-75">{area.status}</p>
        </div>
      ))}
      {visiblePointLabels.map((point) => (
        <div
          key={point.id}
          className={cn("absolute w-[8.8rem] rounded-[5px] border bg-[#061a31]/86 px-2 py-1.5 text-[11px] backdrop-blur-sm", riskVisual[point.riskLevel].bg)}
          style={{ left: `${point.x}%`, top: `${point.y}%`, transform: labelOffsets[point.id] ?? "translate(-50%, -118%)" }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-semibold text-ink">{point.code}</span>
            <span className={cn("shrink-0", riskVisual[point.riskLevel].text)}>{point.status}</span>
          </div>
          <p className="mt-0.5 truncate text-muted">{point.value}{point.unit} / 阈值 {point.threshold}{point.unit}</p>
        </div>
      ))}
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
        {flows.slice(0, 3).map((flow) => (
          <MiniStatusCard key={flow.id} label={`${flow.from} -> ${flow.to}`} value={flow.status} meta={`${flow.label} / ${flow.volume}`} tone={flow.status === "稳定" ? "success" : "warning"} />
        ))}
      </div>
    </div>
  );
}

export function MonitoringTrendConsoleVisual({ channels }: { channels: MonitoringTrendChannel[] }) {
  return (
    <div className="relative min-h-[324px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/78 p-3">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_38%,rgba(34,211,238,0.16),transparent_16rem),radial-gradient(circle_at_76%_42%,rgba(248,113,113,0.12),transparent_11rem)]" />
      <div className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {channels.slice(0, 6).map((channel) => (
          <MiniStatusCard
            key={channel.id}
            label={`${channel.code} ${channel.label}`}
            value={`${channel.currentValue}${channel.unit}`}
            meta={`阈值 ${channel.threshold}${channel.unit} / ${channel.status} / ${channel.updatedAt}`}
            tone={channel.currentValue >= channel.threshold ? "warning" : "success"}
          />
        ))}
      </div>
      <svg viewBox="0 0 800 340" className="relative mt-3 h-[236px] w-full" role="img" aria-label="mock 多通道监测曲线、阈值和通道健康状态">
        <defs>
          <filter id="monitoring-production-glow">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="18" y="20" width="764" height="294" rx="10" fill="rgba(14,165,233,0.04)" stroke="rgba(56,189,248,0.18)" />
        <g stroke="rgba(125,211,252,0.1)" strokeWidth="1">
          {[86, 168, 250, 332, 414, 496, 578, 660, 742].map((x) => <line key={`monitoring-x-${x}`} x1={x} y1="24" x2={x} y2="308" />)}
          {channels.slice(0, 6).map((channel, index) => (
            <line key={`monitoring-row-${channel.id}`} x1="24" y1={78 + index * 43} x2="776" y2={78 + index * 43} />
          ))}
        </g>
        {channels.slice(0, 6).map((channel, index) => {
          const points = svgPointLine(channel, index);
          const threshold = thresholdY(channel, index);
          const last = points.split(" ").at(-1)?.split(",").map(Number) ?? [742, 72 + index * 43];
          return (
            <g key={channel.id} filter="url(#monitoring-production-glow)">
              <rect x="32" y={36 + index * 43} width="728" height="34" rx="7" fill={index % 2 ? "rgba(6,26,49,0.24)" : "rgba(34,211,238,0.035)"} />
              <text x="42" y={56 + index * 43} fill="#dff6ff" fontSize="12" fontWeight="700">{channel.code}</text>
              <text x="42" y={70 + index * 43} fill="#9dc0dc" fontSize="10">{channel.unit} / {channel.status}</text>
              <line x1="118" y1={threshold} x2="748" y2={threshold} stroke={channel.currentValue >= channel.threshold ? "#f97316" : "#facc15"} strokeDasharray="7 7" strokeOpacity="0.58" />
              <polyline points={points} fill="none" stroke={channel.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={last[0]} cy={last[1]} r="5.5" fill={channel.color} />
              <text x="664" y={58 + index * 43} fill={channel.currentValue >= channel.threshold ? "#fed7aa" : "#bae6fd"} fontSize="11">
                {channel.currentValue}{channel.unit} / 阈 {channel.threshold}
              </text>
            </g>
          );
        })}
        <g fill="#7dd3fc" fontSize="10" opacity="0.72">
          <text x="116" y="330">08:30</text>
          <text x="396" y="330">09:00</text>
          <text x="716" y="330">09:30</text>
        </g>
      </svg>
    </div>
  );
}

export function DoublePreventionControlVisual({
  riskMap,
  hazards,
  measures,
  steps,
}: {
  riskMap: RiskMapCell[];
  hazards: HazardLedgerItem[];
  measures: MeasureLibraryItem[];
  steps: WorkflowStep[];
}) {
  const matrix = [
    [1, 2, 4, 6, 6],
    [3, 6, 9, 10, 4],
    [7, 12, 16, 9, 3],
    [5, 10, 12, 6, 1],
    [3, 5, 6, 2, 0],
  ];
  const overdue = hazards.filter((item) => item.overdueDays > 0);

  return (
    <div className="grid min-h-[324px] gap-3 lg:grid-cols-[1.06fr_0.94fr]">
      <div className="relative overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/78 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_28%,rgba(34,211,238,0.14),transparent_13rem),radial-gradient(circle_at_75%_60%,rgba(248,113,113,0.12),transparent_10rem)]" />
        <div className="relative mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">风险矩阵 / 四色管控</p>
          <StatusBadge tone="warning">措施 {measures.length} 条</StatusBadge>
        </div>
        <div className="relative grid grid-cols-[1.2rem_1fr] gap-2">
          <div className="flex items-center justify-center text-[10px] text-muted [writing-mode:vertical-rl]">后果严重性</div>
          <div className="grid grid-cols-5 gap-2">
            {matrix.flatMap((row, rowIndex) =>
              row.map((value, colIndex) => {
                const level: RiskLevel = rowIndex + colIndex >= 7 ? "critical" : rowIndex + colIndex >= 5 ? "high" : rowIndex + colIndex >= 3 ? "normal" : "low";
                const related = riskMap.filter((item) => item.riskLevel === level).length;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn("flex aspect-[1.08] flex-col items-center justify-center rounded-[5px] border text-sm font-semibold", riskVisual[level].bg, riskVisual[level].text)}
                  >
                    <span>{value}</span>
                    <span className="mt-0.5 text-[10px] opacity-70">{riskName[level]} {related}</span>
                  </div>
                );
              }),
            )}
          </div>
          <span />
          <div className="text-center text-[10px] text-muted">发生可能性</div>
        </div>
        <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
          {riskMap.slice(0, 4).map((item) => (
            <div key={item.id} className={cn("rounded-[5px] border px-2.5 py-2", riskVisual[item.riskLevel].bg)}>
              <p className={cn("truncate text-xs font-semibold", riskVisual[item.riskLevel].text)}>{item.regionName}</p>
              <p className="mt-1 truncate text-[11px] text-muted">{item.riskPoint}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/78 p-4">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.04),transparent_42%,rgba(245,158,11,0.06))]" />
        <div className="relative mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">八步闭环推进</p>
          <StatusBadge tone={overdue.length ? "danger" : "success"}>逾期 {overdue.length} 项</StatusBadge>
        </div>
        <div className="relative grid grid-cols-2 gap-2">
          {steps.map((step, index) => (
            <div
              key={step.name}
              className={cn(
                "rounded-[5px] border px-2.5 py-2",
                step.status === "done" && "border-emerald-300/35 bg-emerald-400/12",
                step.status === "active" && "border-amber-300/40 bg-amber-400/14",
                step.status === "pending" && "border-slate-400/22 bg-slate-500/10",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">{index + 1}. {step.name}</span>
                <span className="text-[10px] text-muted">{step.time}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted">{step.owner} / {step.nextHint}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-3 grid gap-2">
          {hazards.slice(0, 2).map((hazard) => (
            <MiniStatusCard
              key={hazard.id}
              label={`${hazard.regionName} / ${hazard.description}`}
              value={hazard.currentStep}
              meta={`${hazard.owner} / ${hazard.deadline} / 逾期 ${hazard.overdueDays} 天`}
              tone={hazard.overdueDays > 0 ? "danger" : "warning"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TwinSpatialSituationVisual({
  zones,
  flows,
  sensorPoints,
}: {
  zones: MineProductionArea[];
  flows: MineVentilationFlow[];
  sensorPoints: SensorChannel[];
}) {
  const visibleZones = zones.filter((zone) => zone.riskLevel !== "low");
  const pointSlots = [
    { x: 22, y: 60 },
    { x: 37, y: 52 },
    { x: 52, y: 42 },
    { x: 65, y: 34 },
    { x: 76, y: 47 },
    { x: 62, y: 66 },
    { x: 45, y: 68 },
    { x: 80, y: 58 },
  ];

  return (
    <div className="relative min-h-[324px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/78">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_44%,rgba(34,211,238,0.22),transparent_17rem),radial-gradient(circle_at_64%_46%,rgba(249,115,22,0.17),transparent_12rem)]" />
      <svg viewBox="0 0 900 460" className="absolute inset-0 h-full w-full" role="img" aria-label="mock 数字孪生矿井空间拓扑、风险热区和通风方向">
        <defs>
          <filter id="twin-production-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="twin-flow-arrow" markerHeight="10" markerWidth="10" orient="auto" refX="8" refY="3">
            <path d="M0,0 L8,3 L0,6 Z" fill="#67e8f9" opacity="0.82" />
          </marker>
        </defs>
        <g opacity="0.42" stroke="rgba(125,211,252,0.15)" strokeWidth="1">
          {Array.from({ length: 12 }).map((_, index) => (
            <path key={`twin-ridge-${index}`} d={`M${index * 76 - 70} 380 L${315 + index * 24} 72 L${920 + index * 36} 258`} fill="none" />
          ))}
          {Array.from({ length: 7 }).map((_, index) => (
            <path key={`twin-depth-${index}`} d={`M70 ${118 + index * 43} C270 ${70 + index * 22} 552 ${86 + index * 39} 826 ${138 + index * 28}`} fill="none" />
          ))}
        </g>
        <g filter="url(#twin-production-glow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={tunnelPath(zones)} stroke="#38bdf8" strokeWidth="8" />
          <path d="M190 318 L354 282 L526 304 L744 260" stroke="rgba(34,211,238,0.68)" strokeWidth="5" />
          <path d="M286 230 L324 148 L452 120 L620 190" stroke="rgba(96,165,250,0.52)" strokeWidth="4" />
          <path d="M430 252 L388 354 L252 370" stroke="rgba(125,211,252,0.42)" strokeWidth="3" />
          {flows.map((flow) => (
            <path
              key={flow.id}
              d={`M ${pctX(flow.x1)} ${pctY(flow.y1)} C ${(pctX(flow.x1) + pctX(flow.x2)) / 2} ${pctY(flow.y1) - 40} ${(pctX(flow.x1) + pctX(flow.x2)) / 2} ${pctY(flow.y2) + 26} ${pctX(flow.x2)} ${pctY(flow.y2)}`}
              stroke="rgba(103,232,249,0.72)"
              strokeDasharray={flow.status === "稳定" ? undefined : "9 8"}
              strokeWidth="2.5"
              markerEnd="url(#twin-flow-arrow)"
            />
          ))}
        </g>
        <g filter="url(#twin-production-glow)">
          {zones.map((zone) => (
            <g key={zone.id}>
              {(zone.riskLevel === "high" || zone.riskLevel === "critical") ? (
                <circle cx={pctX(zone.x)} cy={pctY(zone.y)} r="52" fill={riskVisual[zone.riskLevel].fill} opacity="0.12" />
              ) : null}
              <circle cx={pctX(zone.x)} cy={pctY(zone.y)} r="11" fill={riskVisual[zone.riskLevel].fill} opacity="0.94" />
              <circle cx={pctX(zone.x)} cy={pctY(zone.y)} r="25" fill="none" stroke={riskVisual[zone.riskLevel].stroke} strokeOpacity="0.36" />
            </g>
          ))}
          {sensorPoints.slice(0, 8).map((point, index) => {
            const slot = pointSlots[index] ?? pointSlots[0];
            const color = point.health === "online" ? "#22d3ee" : point.health === "offline" ? "#f87171" : "#facc15";
            return (
              <g key={point.id}>
                <rect x={pctX(slot.x) - 6} y={pctY(slot.y) - 6} width="12" height="12" rx="3" fill={color} opacity="0.95" />
                <circle cx={pctX(slot.x)} cy={pctY(slot.y)} r="16" fill="none" stroke={color} strokeOpacity="0.28" />
              </g>
            );
          })}
        </g>
      </svg>
      {visibleZones.map((zone) => (
        <div
          key={zone.id}
          className={cn("absolute max-w-[8.8rem] rounded-[5px] border px-2.5 py-1.5 text-xs backdrop-blur-sm", riskVisual[zone.riskLevel].bg, riskVisual[zone.riskLevel].text, riskVisual[zone.riskLevel].ring)}
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <p className="truncate font-semibold">{zone.label}</p>
          <p className="mt-0.5 truncate opacity-75">{zone.status}</p>
        </div>
      ))}
      <div className="absolute left-4 top-4 grid w-[17rem] gap-1.5">
        {sensorPoints.slice(0, 3).map((point) => (
          <MiniStatusCard
            key={point.id}
            label={`${point.sensorCode ?? point.id} ${point.name}`}
            value={point.statusLabel ?? point.health}
            meta={`${point.latestValue ?? "--"}${point.unit} / 阈值 ${point.threshold ?? "--"}${point.unit}`}
            tone={healthTone[point.health] ?? "info"}
          />
        ))}
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-4">
        {flows.slice(0, 4).map((flow) => (
          <MiniStatusCard key={flow.id} label={flow.label} value={flow.status} meta={`${flow.from} -> ${flow.to} / ${flow.volume}`} tone={flow.status === "稳定" ? "success" : "warning"} />
        ))}
      </div>
    </div>
  );
}
