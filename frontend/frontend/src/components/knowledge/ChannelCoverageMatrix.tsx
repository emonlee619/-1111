"use client";

import { AlertTriangle } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { cn } from "@/lib/cn";
import type { KbCoverage, KbChannelGroupCoverage } from "@/types/kb";

type Props = { coverage: KbCoverage | null; loading?: boolean; error?: string | null };

export function ChannelCoverageMatrix({ coverage, loading, error }: Props) {
  return (
    <CockpitSectionPanel title="63维指标覆盖矩阵" badge="R / B / S / C" variant="blueBeam">
      {/* B01-B41 硬性边界提示（橙黄） */}
      <div className="mb-3 flex items-start gap-2 rounded-[6px] border border-orange-400/55 bg-orange-400/10 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
        <p className="text-xs leading-5 text-amber-200">{coverage?.bBoundaryWarning ?? "B01-B41 为物理约束生成/估计，不是现场实测，不得单独触发断电、撤人、执法或重大隐患判定。"}</p>
      </div>

      {loading ? <p className="text-sm text-muted">正在加载覆盖率…</p> : null}
      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      {coverage ? (
        <>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <GroupCard g={coverage.realtimeIndicators} />
            <GroupCard g={coverage.physicsConstrained} />
            <GroupCard g={coverage.staticRisks} />
            <GroupCard g={coverage.controlR} />
            <GroupCard g={coverage.controlB} />
            <GroupCard g={coverage.controlS} />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <CoverageBar
              label="报警阈值规则覆盖"
              ratio={coverage.alarmThresholdRuleCoverage}
              hint={`规则 ${coverage.alarmThresholdRuleCount} 条`}
            />
            <CoverageBar
              label="处置流程规则覆盖"
              ratio={coverage.disposalFlowCoverage}
              hint={`规则 ${coverage.disposalFlowRuleCount} 条`}
            />
          </div>
        </>
      ) : null}
    </CockpitSectionPanel>
  );
}

function GroupCard({ g }: { g: KbChannelGroupCoverage }) {
  const pct = g.total ? Math.round((g.covered / g.total) * 100) : 0;
  const isB = g.isPhysicsConstrained;
  return (
    <div
      className={cn(
        "rounded-[5px] border p-2",
        isB ? "border-orange-400/55 bg-orange-400/10" : "border-cyan-300/18 bg-[#031020]/72",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink">{g.label}</span>
        <span className="shrink-0 font-mono text-xs text-primary">
          {g.covered}/{g.total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#020a16]">
        <div
          className={cn("h-1.5 rounded-full", isB ? "bg-orange-400" : "bg-cyan-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isB ? <p className="mt-1 text-[10px] leading-4 text-amber-200">物理约束 · 非现场实测 · 不可单独触发处置</p> : null}
      {g.missing.length > 0 && g.missing.length <= 15 ? (
        <p className="mt-1 text-[10px] leading-4 text-muted">缺失：{g.missing.join(" ")}</p>
      ) : null}
    </div>
  );
}

function CoverageBar({ label, ratio, hint }: { label: string; ratio: number; hint?: string }) {
  const pct = Math.round(ratio * 100);
  return (
    <div className="rounded-[5px] border border-cyan-300/18 bg-[#031020]/72 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink">{label}</span>
        <span className="font-mono text-xs text-primary">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#020a16]">
        <div className="h-1.5 rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
      </div>
      {hint ? <p className="mt-1 text-[10px] text-muted">{hint}</p> : null}
    </div>
  );
}
