import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  BrainCircuit,
  CircleDot,
  Clock,
  Database,
  FileText,
  GitBranch,
  Layers3,
  Network,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import {
  CockpitHeroPanel,
  CockpitMetricCard,
  CockpitPageFrame,
  CockpitSectionPanel,
} from "@/components/cockpit";
import { TwinSpatialSituationVisual } from "@/components/cockpit/ProductionOverviewVisuals";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { generatedChannelNames, mockUpdatedAt, realChannelNames } from "@/data/mockConstants";
import { mockAgent } from "@/data/mockAgent";
import { mockDataModel } from "@/data/mockDataModel";
import { mockKnowledge } from "@/data/mockKnowledge";
import { mockSourceTracing } from "@/data/mockSourceTracing";
import { mockSystem } from "@/data/mockSystem";
import { mockTwin } from "@/data/mockTwin";
import { mockWarnings } from "@/data/mockWarnings";
import { cn } from "@/lib/cn";
import type { BusinessPageContent, OperationLog } from "@/types/business";
import type { CockpitMetricView, QuickActionItem } from "@/types/cockpit";
import type { RouteMeta } from "@/types/navigation";
import type { RiskLevel, StatusTone } from "@/types/risk";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Stage5ModuleShowcasePageProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
};

const stage5Paths = new Set(["/source-tracing", "/twin", "/data", "/knowledge", "/system"]);

const riskLabel: Record<RiskLevel, string> = {
  low: "低风险",
  normal: "一般风险",
  high: "较大风险",
  critical: "重大风险",
};

const channelHealthLabel: Record<string, string> = {
  online: "在线",
  calibrating: "漂移校验",
  maintenance: "维护中",
  offline: "离线",
};

const toneTextClass: Record<StatusTone, string> = {
  neutral: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export function isStage5Path(path: string) {
  return stage5Paths.has(path);
}

function iconNode(Icon: LucideIcon) {
  return <Icon className="h-4 w-4" aria-hidden />;
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
  compact = false,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      "grid min-w-0 gap-3 xl:grid-cols-[minmax(230px,0.88fr)_minmax(0,1.76fr)_minmax(230px,0.88fr)]",
      compact ? "xl:h-[430px]" : "xl:h-[456px]",
    )}>
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
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            {item.risk ? (
              <RiskLevelBadge level={item.risk} />
            ) : (
              <StatusBadge tone={item.tone ?? "neutral"}>{item.value}</StatusBadge>
            )}
          </div>
          {item.meta ? <p className="mt-1 truncate text-xs text-muted">{item.meta}</p> : null}
        </li>
      ))}
    </ul>
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
        <li key={item.label} className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted">{item.label}</span>
            <span className={cn("font-semibold", toneTextClass[item.tone ?? "info"])}>{item.value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
            <span
              className={cn(
                "block h-full rounded-full",
                item.tone === "danger" && "bg-danger",
                item.tone === "warning" && "bg-warning",
                item.tone === "success" && "bg-success",
                (!item.tone || item.tone === "info" || item.tone === "neutral") && "bg-primary",
              )}
              style={{ width: `${item.value}%` }}
            />
          </div>
          {item.meta ? <p className="mt-1 truncate text-[11px] text-muted">{item.meta}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function TimelineRail({ items }: { items: { time: string; title: string; description: string; tone?: StatusTone }[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item) => (
        <li key={`${item.time}-${item.title}`} className="grid grid-cols-[3rem_1fr] gap-2 text-sm">
          <span className={cn("text-xs font-semibold", toneTextClass[item.tone ?? "info"])}>{item.time}</span>
          <span className="min-w-0 border-l border-cyan-300/22 pl-3">
            <span className="block truncate font-medium text-ink">{item.title}</span>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted">{item.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function BoundaryNote({ children, subdued = false }: { children: ReactNode; subdued?: boolean }) {
  return (
    <div className={cn(
      "rounded-[5px] border px-3 py-2 text-xs leading-5 text-muted",
      subdued ? "border-slate-500/18 bg-slate-900/32" : "border-cyan-300/14 bg-[#03101f]/44",
    )}>
      {children}
    </div>
  );
}

function QuickAccessDock({ actions, subdued = false }: { actions: QuickActionItem[]; subdued?: boolean }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href ?? "#"}
          className={cn(
            "cockpit-chamfer-md group relative min-h-[88px] overflow-hidden rounded-[7px] border p-3 transition",
            subdued
              ? "border-slate-500/22 bg-[#071421]/72 hover:border-cyan-300/38 hover:bg-slate-700/14"
              : "border-[var(--mine-border)] bg-[#061a31]/78 hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)]",
          )}
        >
          <span className={cn("absolute inset-x-3 top-0 h-px", subdued ? "bg-slate-400/40" : "bg-cyan-200/50")} />
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border",
              subdued ? "border-slate-500/24 bg-slate-500/10 text-slate-200" : "border-cyan-300/28 bg-cyan-300/10 text-primary",
            )}>
              {action.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{action.label}</span>
              <span className="mt-1 block truncate text-xs text-muted">{action.description}</span>
            </span>
          </div>
          {action.status ? <span className={cn("absolute bottom-3 right-3 text-xs", subdued ? "text-slate-300" : "text-primary")}>{action.status}</span> : null}
        </Link>
      ))}
    </section>
  );
}

function SourceTracingVisual() {
  const weights = mockSourceTracing.attentionWeights;

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(239,68,68,0.16),transparent_15rem),radial-gradient(circle_at_24%_22%,rgba(34,211,238,0.18),transparent_18rem)]" />
      <svg viewBox="0 0 860 320" className="relative h-[224px] w-full" role="img" aria-label="mock 注意力权重热区与致因链路">
        <defs>
          <filter id="source-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="source-heat" x1="0" x2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#f97316" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <g stroke="rgba(125,211,252,0.12)">
          {Array.from({ length: 9 }).map((_, index) => (
            <line key={`source-grid-${index}`} x1="0" y1={index * 40} x2="860" y2={index * 40} />
          ))}
        </g>
        <g filter="url(#source-glow)">
          {weights.map((item, index) => {
            const y = 48 + index * 54;
            return (
              <g key={item.feature}>
                <rect x="28" y={y - 18} width="198" height="36" rx="8" fill="rgba(6,26,49,0.92)" stroke="rgba(34,211,238,0.32)" />
                <circle cx="48" cy={y} r="9" fill={index === 0 ? "#f97316" : "#22d3ee"} />
                <text x="66" y={y - 3} fill="#eaf6ff" fontSize="13">{item.feature.slice(0, 12)}</text>
                <text x="66" y={y + 13} fill="#9dc0dc" fontSize="11">{item.channelId} / {Math.round(item.weight * 100)}%</text>
                <path d={`M226 ${y} C320 ${y - 34 + index * 10} 360 150 454 ${150 + (index - 1) * 18}`} fill="none" stroke="rgba(56,189,248,0.6)" strokeWidth={index === 0 ? 3 : 2} strokeDasharray={index % 2 ? "6 7" : undefined} />
              </g>
            );
          })}
          <rect x="428" y="104" width="174" height="92" rx="16" fill="rgba(239,68,68,0.22)" stroke="rgba(248,113,113,0.68)" />
          <text x="456" y="142" fill="#fecaca" fontSize="18" fontWeight="700">瓦斯异常积聚</text>
          <text x="456" y="166" fill="#fca5a5" fontSize="12">影响度 0.78 / 待复核</text>
          <path d="M602 150 C668 136 694 104 760 112" fill="none" stroke="#f97316" strokeWidth="3" />
          <path d="M602 164 C676 176 698 210 764 220" fill="none" stroke="#22d3ee" strokeWidth="2" />
          <rect x="710" y="82" width="124" height="58" rx="12" fill="rgba(245,158,11,0.18)" stroke="rgba(251,191,36,0.58)" />
          <text x="730" y="112" fill="#fde68a" fontSize="14">通风量不足</text>
          <rect x="710" y="194" width="124" height="58" rx="12" fill="rgba(34,211,238,0.12)" stroke="rgba(34,211,238,0.42)" />
          <text x="730" y="224" fill="#bae6fd" fontSize="14">作业扰动</text>
        </g>
        <rect x="292" y="258" width="326" height="24" rx="12" fill="url(#source-heat)" opacity="0.88" />
        <text x="306" y="275" fill="#03101f" fontSize="12" fontWeight="700">注意力热区：风压 / 瓦斯变化率 / 微震能量</text>
      </svg>
      <div className="relative grid gap-2 sm:grid-cols-4">
        {weights.map((item) => (
          <div key={item.feature} className="rounded-[5px] border border-cyan-300/18 bg-[#03101f]/64 px-2.5 py-2">
            <p className="truncate text-xs text-muted">{item.feature}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cyan-300/10">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(item.weight * 100) * 2.7}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwinVisual() {
  return (
    <TwinSpatialSituationVisual
      zones={mockTwin.spatialZones}
      flows={mockTwin.ventilationFlows}
      sensorPoints={mockTwin.sensorPoints}
    />
  );
}

function DataModelVisual() {
  const pipeline = [
    { label: "真实通道", value: String(mockDataModel.augmentation.realChannelCount), tone: "info" as StatusTone },
    { label: "生成前兆", value: String(mockDataModel.augmentation.generatedChannelCount), tone: "warning" as StatusTone },
    { label: "特征结构", value: String(mockDataModel.augmentation.featureCount), tone: "success" as StatusTone },
    { label: "模型评估", value: "F1 87%", tone: "info" as StatusTone },
    { label: "版本状态", value: "active", tone: "success" as StatusTone },
  ];

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.18),transparent_16rem),radial-gradient(circle_at_72%_50%,rgba(245,158,11,0.13),transparent_12rem)]" />
      <div className="relative grid gap-3">
        <div className="grid gap-3 lg:grid-cols-5">
          {pipeline.map((step, index) => (
            <div key={step.label} className="relative rounded-[6px] border border-cyan-300/22 bg-[#061a31]/84 p-3">
              {index < pipeline.length - 1 ? <span className="absolute -right-3 top-1/2 hidden h-px w-3 bg-cyan-300/45 lg:block" /> : null}
              <p className="text-xs text-muted">{step.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{step.value}</p>
              <StatusBadge tone={step.tone}>{index === 1 ? "辅助" : "展示"}</StatusBadge>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
          <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-2 text-sm font-semibold text-ink">真实通道来源</p>
            <div className="grid grid-cols-7 gap-1">
              {realChannelNames.map((name, index) => (
                <span key={name} title={name} className="h-6 rounded-[4px] border border-cyan-300/24 bg-cyan-300/18 text-center text-[10px] leading-6 text-cyan-100">
                  R{index + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[6px] border border-amber-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-2 text-sm font-semibold text-ink">历史生成前兆说明</p>
            <div className="grid grid-cols-7 gap-1">
              {generatedChannelNames.map((name, index) => (
                <span key={name} title={name} className="h-6 rounded-[4px] border border-amber-300/24 bg-amber-300/16 text-center text-[10px] leading-6 text-amber-100">
                  G{index + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[6px] border border-cyan-300/18 bg-[#03101f]/58 p-3">
            <p className="mb-2 text-sm font-semibold text-ink">数据集 / 模型链路</p>
            <ProgressList
              items={[
                { label: "物理约束满足率", value: Math.round(mockDataModel.augmentation.physicalConstraintRate * 100), tone: "success", meta: mockDataModel.augmentation.datasetVersion },
                { label: "KS 检验通过率", value: Math.round(mockDataModel.augmentation.ksPassRate * 100), tone: "info", meta: "生成分布验证" },
                { label: "召回率", value: Math.round(mockDataModel.modelEvaluation.recall * 100), tone: "success", meta: mockDataModel.modelEvaluation.modelVersion },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeVisual() {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[6px] border border-cyan-300/20 bg-[#020b18]/72 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(34,211,238,0.16),transparent_14rem),radial-gradient(circle_at_36%_42%,rgba(59,130,246,0.15),transparent_15rem)]" />
      <div className="relative grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[6px] border border-cyan-300/20 bg-[#061a31]/78 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-ink">AI 问答辅助</p>
            <StatusBadge tone="info">引用优先</StatusBadge>
          </div>
          <div className="rounded-[6px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-ink">
            掘进工作面瓦斯浓度升高的常见原因有哪些？应采取哪些处置措施？
          </div>
          <div className="mt-3 rounded-[6px] border border-cyan-300/16 bg-[#03101f]/64 p-3 text-xs leading-6 text-muted">
            {mockAgent.mockAnswer}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mockAgent.citations.slice(0, 3).map((item) => (
              <span key={item.id} className="rounded-[4px] border border-cyan-300/22 bg-cyan-300/8 px-2 py-1 text-[11px] text-primary">
                {item.id} / {item.category}
              </span>
            ))}
          </div>
        </div>
        <div className="relative min-h-[236px] rounded-[6px] border border-cyan-300/20 bg-[#03101f]/58">
          <svg viewBox="0 0 380 236" className="absolute inset-0 h-full w-full" role="img" aria-label="mock 致灾知识图谱">
            <defs>
              <filter id="knowledge-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g stroke="rgba(34,211,238,0.45)" strokeWidth="2">
              <line x1="190" y1="118" x2="84" y2="60" />
              <line x1="190" y1="118" x2="96" y2="176" />
              <line x1="190" y1="118" x2="286" y2="62" />
              <line x1="190" y1="118" x2="302" y2="174" />
              <line x1="190" y1="118" x2="190" y2="36" />
            </g>
            {[
              [190, 118, "瓦斯异常", "#ef4444"],
              [84, 60, "抽采不足", "#22d3ee"],
              [96, 176, "地质构造", "#22d3ee"],
              [286, 62, "通风不足", "#f59e0b"],
              [302, 174, "电气失爆", "#f59e0b"],
              [190, 36, "处置规范", "#22c55e"],
            ].map(([x, y, label, color]) => (
              <g key={String(label)} filter="url(#knowledge-glow)">
                <circle cx={Number(x)} cy={Number(y)} r={label === "瓦斯异常" ? 34 : 25} fill={String(color)} opacity="0.2" stroke={String(color)} strokeWidth="2" />
                <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" fill="#eaf6ff" fontSize="12">{String(label)}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function SystemVisual() {
  const services = [
    { label: "接入网关", value: "正常", tone: "success" as StatusTone },
    { label: "认证服务", value: "正常", tone: "success" as StatusTone },
    { label: "权限服务", value: "正常", tone: "success" as StatusTone },
    { label: "消息服务", value: "告警", tone: "warning" as StatusTone },
    { label: "数据服务", value: "正常", tone: "success" as StatusTone },
    { label: "日志服务", value: "正常", tone: "success" as StatusTone },
  ];

  return (
    <div className="relative min-h-[282px] overflow-hidden rounded-[6px] border border-slate-500/20 bg-[#071421]/84 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-60" />
      <div className="relative grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[6px] border border-slate-500/18 bg-[#0a1828]/72 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">系统服务状态拓扑</p>
            <StatusBadge tone="success">低装饰模式</StatusBadge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service, index) => (
              <div key={service.label} className="rounded-[5px] border border-slate-500/18 bg-slate-900/28 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-ink">{service.label}</span>
                  <StatusBadge tone={service.tone}>{service.value}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted">节点 {String(index + 1).padStart(2, "0")} / mock 健康检查</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[6px] border border-slate-500/18 bg-[#0a1828]/72 p-3">
          <p className="mb-3 text-sm font-semibold text-ink">日志趋势与权限风险</p>
          <svg viewBox="0 0 340 130" className="h-[128px] w-full" aria-hidden>
            <g stroke="rgba(148,163,184,0.16)">
              <line x1="8" y1="28" x2="332" y2="28" />
              <line x1="8" y1="66" x2="332" y2="66" />
              <line x1="8" y1="104" x2="332" y2="104" />
            </g>
            <polyline points="10,88 64,58 118,46 172,70 226,48 280,84 330,92" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            <polyline points="10,106 64,98 118,104 172,92 226,96 280,108 330,112" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <ProgressList
            items={[
              { label: "系统健康度", value: 96, tone: "success", meta: "运行稳定" },
              { label: "权限风险复核", value: 12, tone: "warning", meta: "演示权限申请" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function SourceTracingStage5(props: Stage5ModuleShowcasePageProps) {
  const latest = mockWarnings.events[0];

  return (
    <CockpitPageFrame {...props} kicker="辅助解释 / 人工复核 / 非最终事故原因" compactStatus="溯源 mock 总览">
      <MetricRow
        metrics={[
          { label: "最近预警事件", value: latest.id, hint: latest.summary, trend: latest.regionName, risk: latest.riskLevel, icon: iconNode(AlertTriangle), tone: "amber", status: "待复核" },
          { label: "主要贡献指标", value: String(mockSourceTracing.attentionWeights.length), unit: "项", hint: "注意力权重 Top", trend: mockSourceTracing.attentionWeights[0].feature, risk: "normal", icon: iconNode(BarChart3), tone: "cyan", status: "解释" },
          { label: "疑似危险源", value: "1", unit: "处", hint: "东翼回风巷链路", trend: "通风扰动 + 瓦斯变化", risk: "high", icon: iconNode(CircleDot), tone: "red", status: "疑似" },
          { label: "综合置信度", value: "0.83", hint: "mock 模型融合值", trend: "较昨日 +0.06", risk: "normal", icon: iconNode(BrainCircuit), tone: "green", status: "辅助" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="致因贡献排行" badge="Top 4" tone="warning">
              <ProgressList
                items={mockSourceTracing.attentionWeights.map((item) => ({
                  label: item.feature,
                  value: Math.round(item.weight * 100 * 3.4),
                  meta: item.channelId,
                  tone: item.weight > 0.2 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="特征注意力热区" badge="30 min" tone="info" moreHref="/source-tracing/attention">
              <DenseList
                items={mockSourceTracing.attentionWeights.map((item) => ({
                  label: item.feature,
                  value: `${Math.round(item.weight * 100)}%`,
                  meta: item.contribution,
                  tone: item.weight > 0.2 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="注意力权重热区 / 致因链路"
            description="中心主视觉表达从贡献指标到疑似危险源的辅助解释链路，结论必须由人工复核。"
            modeLabel="研判模式"
            modes={["贡献热区", "致因链路", "事件追踪"]}
            activeMode="贡献热区"
            legend={[
              { label: "直接影响", tone: "danger" },
              { label: "间接影响", tone: "warning" },
              { label: "需复核", tone: "info" },
            ]}
          >
            <SourceTracingVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="事件追踪时间线" badge="最近" tone="danger" moreHref="/warning/events/W001">
              <TimelineRail
                items={[
                  { time: latest.eventTime.slice(11, 16), title: latest.summary, description: `${latest.regionName} / ${latest.owner}`, tone: "danger" },
                  ...mockSourceTracing.causalChain,
                ]}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="关键证据" badge="Top 3" tone="info">
              <DenseList
                items={mockSourceTracing.contributionMetrics.map((item) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "注意力分析", href: "/source-tracing/attention", description: "指标贡献与权重", status: "权重", icon: iconNode(BarChart3) },
          { label: "预警详情", href: "/warning/events/W001", description: "事件处置上下文", status: "事件", icon: iconNode(AlertTriangle) },
          { label: "事件追踪", href: "/source-tracing/events/W001", description: "动态详情示例", status: "追踪", icon: iconNode(GitBranch) },
          { label: "致灾图谱", href: "/knowledge/causal-graph", description: "知识侧因果关系", status: "图谱", icon: iconNode(Network) },
        ]}
      />
      <BoundaryNote>辅助研判，人工复核，非最终事故原因；本页不调用真实模型推理，不写入真实事件台账。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function TwinStage5(props: Stage5ModuleShowcasePageProps) {
  const highRisk = mockTwin.heatmapCells.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length;
  const online = mockTwin.sensorPoints.filter((point) => point.health === "online").length;

  return (
    <CockpitPageFrame {...props} kicker="空间态势 / 风险热力 / 点位健康" compactStatus="空间 mock 总览">
      <MetricRow
        metrics={[
          { label: "巷道分区", value: String(mockTwin.spatialZones.length), unit: "区", hint: "主斜井、运输巷、回风巷、采掘面", trend: "不加载真实三维资产", risk: "low", icon: iconNode(Boxes), tone: "cyan", status: "示意" },
          { label: "风险热区", value: String(mockTwin.heatmapCells.length), unit: "处", hint: "瓦斯、压力、巡检热区 mock", trend: `高关注 ${highRisk} 处`, risk: highRisk ? "high" : "low", icon: iconNode(Activity), tone: "amber", status: "热力" },
          { label: "传感器点位", value: String(mockTwin.sensorPoints.length), unit: "个", hint: "点位脱敏，仅展示编号/状态/当前值", trend: `在线 ${online} 个 / 维护 ${mockTwin.sensorPoints.length - online} 个`, risk: "low", icon: iconNode(CircleDot), tone: "green", status: "健康" },
          { label: "通风流线", value: String(mockTwin.ventilationFlows.length), unit: "条", hint: mockUpdatedAt, trend: "入风、采掘供风、回风流线", risk: "normal", icon: iconNode(Clock), tone: "blue", status: "快照" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="空间分区状态" badge={`${mockTwin.spatialZones.length} 区`} tone="warning" moreHref="/twin/tunnel">
              <DenseList
                items={mockTwin.spatialZones.map((zone) => ({
                  label: zone.label,
                  value: riskLabel[zone.riskLevel],
                  meta: `${zone.role} / ${zone.status}`,
                  risk: zone.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="风险热区与在线点位" badge="热力" tone="info" moreHref="/twin/risk-heatmap">
              <DenseList
                items={mockTwin.heatmapCells.map((item) => ({
                  label: item.regionName,
                  value: riskLabel[item.riskLevel],
                  meta: item.riskPoint,
                  risk: item.riskLevel,
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="伪 3D 巷道拓扑 / 风险热力层"
            description="以轻量 SVG/CSS 表达矿井分区、采掘面、传感器点位、风险热区和通风方向。"
            modeLabel="空间模式"
            modes={["三维视角", "风险热力", "传感器点位"]}
            activeMode="三维视角"
            legend={[
              { label: "风险热区", value: String(mockTwin.heatmapCells.length), tone: "warning" },
              { label: "在线点位", value: String(online), tone: "success" },
              { label: "空间快照", tone: "info" },
            ]}
          >
            <TwinVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="点位详情" badge={`${online}/${mockTwin.sensorPoints.length}`} tone="success" moreHref="/twin/sensors">
              <DenseList
                items={mockTwin.sensorPoints.slice(0, 5).map((point) => ({
                  label: point.sensorCode ?? point.name,
                  value: channelHealthLabel[point.health] ?? point.health,
                  meta: `${point.regionName} / ${point.latestValue ?? "--"}${point.unit} / 阈值 ${point.threshold ?? "--"}${point.unit}`,
                  tone: point.health === "online" ? "success" : "warning",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="巡检与最近异常" badge="mock" tone="warning">
              <DenseList
                items={mockTwin.patrolStates.map((item, index) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: index === 1 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "巷道态势", href: "/twin/tunnel", description: "主斜井、运输巷、回风巷拓扑", status: "空间", icon: iconNode(Boxes) },
          { label: "风险热力", href: "/twin/risk-heatmap", description: `热区 ${mockTwin.heatmapCells.length} 处，高关注 ${highRisk} 处`, status: "热力", icon: iconNode(Activity) },
          { label: "传感器点位", href: "/twin/sensors", description: `点位 ${mockTwin.sensorPoints.length} 个，在线 ${online} 个`, status: "点位", icon: iconNode(CircleDot) },
          { label: "区域风险", href: "/regions", description: "空间分区联动风险台账", status: "区域", icon: iconNode(Network) },
        ]}
      />
      <BoundaryNote>mock 空间数据边界：不加载真实矿井三维模型，不展示敏感精确空间信息，不接真实定位或监测流。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function DataStage5(props: Stage5ModuleShowcasePageProps) {
  const augmentation = mockDataModel.augmentation;
  const evaluation = mockDataModel.modelEvaluation;

  return (
    <CockpitPageFrame {...props} kicker="数据资产 / 增强验证 / 模型评估 / 版本链路" compactStatus="展示边界">
      <MetricRow
        metrics={[
          { label: "真实通道", value: String(augmentation.realChannelCount), unit: "路", hint: "真实传感器来源", trend: "不与生成通道混写", risk: "low", icon: iconNode(Database), tone: "cyan", status: "真实" },
          { label: "生成前兆通道", value: String(augmentation.generatedChannelCount), unit: "路", hint: "WGAN-GP 输出结果", trend: "不替代真实监测", risk: "normal", icon: iconNode(Zap), tone: "amber", status: "辅助" },
          { label: "指标结构", value: String(augmentation.featureCount), unit: "维", hint: "以后端元数据为准", trend: "动态覆盖", risk: "low", icon: iconNode(Layers3), tone: "green", status: "动态" },
          { label: "模型评估", value: `${Math.round(evaluation.macroF1 * 100)}%`, hint: "Macro-F1 mock", trend: evaluation.modelVersion, risk: "normal", icon: iconNode(BrainCircuit), tone: "blue", status: "评估" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="通道构成" badge="动态" tone="info" moreHref="/data/features">
              <div className="grid grid-cols-[6rem_1fr] items-center gap-3">
                <div className="relative h-24 w-24 rounded-full border border-cyan-300/24 bg-[conic-gradient(#22d3ee_0_42%,#f59e0b_42%_100%)] p-3">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#03101f] text-center">
                    <span className="text-xl font-semibold text-ink">33</span>
                    <span className="text-[11px] text-muted">总通道</span>
                  </div>
                </div>
                <DenseList
                  items={[
                    { label: "真实通道", value: `${augmentation.realChannelCount} 路`, meta: "实测传感器", tone: "info" },
                    { label: "生成前兆", value: `${augmentation.generatedChannelCount} 路`, meta: "辅助指标", tone: "warning" },
                  ]}
                />
              </div>
            </CockpitSectionPanel>
            <CockpitSectionPanel title="增强验证指标" badge="WGAN-GP" tone="warning" moreHref="/data/augmentation">
              <ProgressList
                items={[
                  { label: "物理约束满足率", value: Math.round(augmentation.physicalConstraintRate * 100), tone: "success", meta: augmentation.datasetVersion },
                  { label: "对抗验证 AUC", value: Math.round(augmentation.adversarialValidationAuc * 100), tone: "info", meta: "分布验证摘要" },
                  { label: "KS 检验通过率", value: Math.round(augmentation.ksPassRate * 100), tone: "success", meta: "mock 验证指标" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="数据资产 + 模型链路驾驶舱"
            description="中心主视觉串联真实通道、历史生成指标边界、动态特征、模型评估和版本状态。"
            modeLabel="链路视图"
            modes={["总览", "数据资产", "数据增强", "模型评估"]}
            activeMode="总览"
            legend={[
              { label: "真实传感器", value: "14", tone: "info" },
              { label: "生成前兆", value: "19", tone: "warning" },
              { label: "评估版本", value: evaluation.modelVersion, tone: "success" },
            ]}
          >
            <DataModelVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="版本谱系" badge="数据 -> 模型" tone="info" moreHref="/model/version">
              <DenseList
                items={mockDataModel.modelVersions.map((version) => ({
                  label: version.version,
                  value: version.status,
                  meta: `${version.datasetVersion} / ${version.evaluationSummary}`,
                  tone: version.status === "active" ? "success" : "neutral",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="模型评估摘要" badge="mock" tone="success" moreHref="/model/evaluation">
              <ProgressList
                items={[
                  { label: "召回率", value: Math.round(evaluation.recall * 100), tone: "success", meta: evaluation.datasetVersion },
                  { label: "误报率控制", value: 100 - Math.round(evaluation.falseAlarmRate * 100), tone: "warning", meta: "误报率越低越好" },
                  { label: "准确率", value: Math.round((evaluation.accuracy ?? 0) * 100), tone: "info", meta: evaluation.evaluatedAt },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "数据资产", href: "/data/features", description: "后端指标字典", status: "特征", icon: iconNode(Layers3) },
          { label: "数据增强", href: "/data/augmentation", description: "增强结果与验证", status: "展示", icon: iconNode(Zap) },
          { label: "模型评估", href: "/model/evaluation", description: "指标与混淆矩阵", status: "评估", icon: iconNode(BrainCircuit) },
          { label: "版本管理", href: "/model/version", description: "数据集与模型版本", status: "版本", icon: iconNode(FileText) },
        ]}
      />
      <BoundaryNote>生成通道为辅助前兆指标，不替代真实传感器监测；本页不训练 WGAN-GP、不保存模型权重、不提交大型训练数据。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function KnowledgeStage5(props: Stage5ModuleShowcasePageProps) {
  return (
    <CockpitPageFrame {...props} kicker="标准检索 / 致灾图谱 / AI 问答辅助" compactStatus="知识 mock 总览">
      <MetricRow
        metrics={[
          { label: "标准规范条目", value: String(mockKnowledge.standards.length), unit: "类", hint: "标准检索入口", trend: "摘要与场景", risk: "low", icon: iconNode(BookOpen), tone: "cyan", status: "检索" },
          { label: "AI 推荐问题", value: String(mockAgent.recommendedQuestions.length), unit: "个", hint: "问答辅助入口", trend: "引用优先", risk: "normal", icon: iconNode(Bot), tone: "blue", status: "辅助" },
          { label: "图谱关系", value: "22", unit: "条", hint: "mock 致灾关系边", trend: "非最终认定", risk: "normal", icon: iconNode(Network), tone: "amber", status: "图谱" },
          { label: "人工复核提示", value: "必须", hint: "问答不替代正式制度解释", trend: "引用证据可追溯", risk: "low", icon: iconNode(ShieldCheck), tone: "green", status: "边界" },
        ]}
      />
      <CockpitColumns
        left={(
          <>
            <CockpitSectionPanel title="标准库分类" badge="规范" tone="info" moreHref="/knowledge/search">
              <DenseList
                items={mockKnowledge.standards.map((item) => ({
                  label: item.category,
                  value: item.id,
                  meta: item.title,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="热门问题 Top5" badge="咨询" tone="warning">
              <DenseList
                items={mockAgent.recommendedQuestions.slice(0, 5).map((question, index) => ({
                  label: `${index + 1}. ${question}`,
                  value: `${1280 - index * 132}`,
                  meta: "mock 热门咨询",
                  tone: index < 2 ? "warning" : "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="知识检索 + 致灾图谱 + AI 问答"
            description="以引用证据和图谱关系辅助安全研判，回答不替代正式制度解释。"
            modeLabel="知识模式"
            modes={["总览", "标准检索", "致灾图谱", "AI问答"]}
            activeMode="总览"
            legend={[
              { label: "引用证据", value: String(mockAgent.citations.length), tone: "info" },
              { label: "人工复核", tone: "warning" },
              { label: "制度边界", tone: "success" },
            ]}
          >
            <KnowledgeVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="致灾知识图谱" badge="示例" tone="info" moreHref="/knowledge/causal-graph">
              <DenseList
                items={mockKnowledge.causalGraph.map((item) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="处置指南推荐" badge="引用" tone="success">
              <DenseList
                items={mockAgent.citations.map((item) => ({
                  label: item.title,
                  value: item.id,
                  meta: item.summary,
                  tone: "success",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        actions={[
          { label: "标准检索", href: "/knowledge/search", description: "检索规范与条文", status: "检索", icon: iconNode(Search) },
          { label: "致灾图谱", href: "/knowledge/causal-graph", description: "因素与关系边", status: "图谱", icon: iconNode(Network) },
          { label: "AI问答", href: "/agent", description: "智能问答与引用", status: "问答", icon: iconNode(Bot) },
          { label: "文化展板", href: "/knowledge/culture-board", description: "弱化知识入口", status: "展板", icon: iconNode(BookOpen) },
        ]}
      />
      <BoundaryNote>AI 回答必须展示引用证据和人工复核提示，不替代正式制度解释，不输出强制处置命令。</BoundaryNote>
    </CockpitPageFrame>
  );
}

function SystemStage5(props: Stage5ModuleShowcasePageProps) {
  const riskLogs = mockSystem.logs.filter((log: OperationLog) => log.riskLevel).length;

  return (
    <CockpitPageFrame {...props} kicker="低装饰 / 强可读 / 管理工作台" compactStatus="系统 mock 总览" className="xl:[&_.cockpit-chamfer-lg]:shadow-none">
      <MetricRow
        metrics={[
          { label: "在线用户", value: String(mockSystem.users.length * 12), unit: "人", hint: "演示用户规模", trend: "不接真实认证", risk: "low", icon: iconNode(Users), tone: "blue", status: "mock" },
          { label: "角色数量", value: "3", unit: "类", hint: "安全/监测/系统", trend: "权限矩阵摘要", risk: "low", icon: iconNode(ShieldCheck), tone: "cyan", status: "权限" },
          { label: "今日日志", value: "1,256", unit: "条", hint: "操作日志趋势", trend: `风险动作 ${riskLogs} 类`, risk: "normal", icon: iconNode(FileText), tone: "amber", status: "审计" },
          { label: "系统健康度", value: "96", unit: "%", hint: "mock 健康检查", trend: "运行稳定", risk: "low", icon: iconNode(Server), tone: "green", status: "稳定" },
        ]}
      />
      <CockpitColumns
        compact
        left={(
          <>
            <CockpitSectionPanel title="权限分布" badge="角色" tone="info" className="bg-[#071421]/82">
              <DenseList
                items={mockSystem.users.map((user) => ({
                  label: user.role,
                  value: user.status,
                  meta: `${user.unit} / ${user.permissionScope}`,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="权限风险提示" badge="复核" tone="warning" className="bg-[#071421]/82">
              <ProgressList
                items={[
                  { label: "新增权限申请", value: 28, tone: "warning", meta: "待审批" },
                  { label: "配置变更复核", value: 14, tone: "info", meta: "只读展示" },
                  { label: "异常操作占比", value: 4, tone: "success", meta: "mock 统计" },
                ]}
              />
            </CockpitSectionPanel>
          </>
        )}
        center={(
          <CockpitHeroPanel
            title="系统健康 / 权限矩阵 / 日志趋势"
            description="系统管理保持低装饰、强可读，突出权限、日志、配置与健康状态。"
            modeLabel="管理视图"
            modes={["总览", "用户权限", "操作日志", "系统配置"]}
            activeMode="总览"
            legend={[
              { label: "健康", value: "96%", tone: "success" },
              { label: "告警", value: "2", tone: "warning" },
              { label: "审计", value: "只读", tone: "info" },
            ]}
            className="border-slate-500/24 bg-[#071421]/88 shadow-[0_14px_34px_rgba(0,0,0,0.22)]"
          >
            <SystemVisual />
          </CockpitHeroPanel>
        )}
        right={(
          <>
            <CockpitSectionPanel title="操作日志趋势" badge="近7天" tone="info" moreHref="/system/logs" className="bg-[#071421]/82">
              <DenseList
                items={mockSystem.logs.map((log) => ({
                  label: log.action,
                  value: log.result,
                  meta: `${log.time} / ${log.module}`,
                  tone: log.riskLevel ? "warning" : "success",
                }))}
              />
            </CockpitSectionPanel>
            <CockpitSectionPanel title="配置状态" badge="只读" tone="success" moreHref="/system/config" className="bg-[#071421]/82">
              <DenseList
                items={mockSystem.configs.map((item) => ({
                  label: item.label,
                  value: String(item.value),
                  meta: item.hint,
                  tone: "info",
                }))}
              />
            </CockpitSectionPanel>
          </>
        )}
      />
      <QuickAccessDock
        subdued
        actions={[
          { label: "用户权限", href: "/system/users", description: "用户与角色矩阵", status: "权限", icon: iconNode(Users) },
          { label: "操作日志", href: "/system/logs", description: "审计检索与趋势", status: "日志", icon: iconNode(FileText) },
          { label: "系统配置", href: "/system/config", description: "平台参数与阈值", status: "配置", icon: iconNode(Settings) },
          { label: "系统健康", href: "/system", description: "服务状态总览", status: "健康", icon: iconNode(Wrench) },
        ]}
      />
      <BoundaryNote subdued>系统管理为低装饰工作台：不接真实认证、授权、审计或配置写入，不展示真实账号、IP 或敏感操作记录。</BoundaryNote>
    </CockpitPageFrame>
  );
}

export function Stage5ModuleShowcasePage(props: Stage5ModuleShowcasePageProps) {
  switch (props.content.path) {
    case "/source-tracing":
      return <SourceTracingStage5 {...props} />;
    case "/twin":
      return <TwinStage5 {...props} />;
    case "/data":
      return <DataStage5 {...props} />;
    case "/knowledge":
      return <KnowledgeStage5 {...props} />;
    case "/system":
      return <SystemStage5 {...props} />;
    default:
      return null;
  }
}
