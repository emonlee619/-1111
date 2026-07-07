import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { CockpitMetricView } from "@/types/cockpit";

const metricToneClass: Record<NonNullable<CockpitMetricView["tone"]>, string> = {
  cyan: "border-cyan-300/50 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)]",
  blue: "border-sky-300/50 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.16)]",
  green: "border-emerald-300/50 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.14)]",
  amber: "border-amber-300/55 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.16)]",
  red: "border-red-300/55 text-red-100 shadow-[0_0_24px_rgba(248,113,113,0.18)]",
};

export function CockpitMetricCard({ metric }: { metric: CockpitMetricView }) {
  return (
    <article className="cockpit-chamfer-md group relative min-h-[92px] min-w-0 overflow-hidden rounded-[7px] border border-[var(--mine-border)] bg-[#061a31]/82 px-3 py-3 shadow-[inset_0_0_24px_rgba(34,211,238,0.06),0_16px_34px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:px-4">
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-cyan-200/70 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
      <span className="pointer-events-none absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-300/16" />
      <div className="relative flex h-full min-w-0 flex-wrap items-center gap-3">
        <div className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-[#051428]/88 sm:h-14 sm:w-14", metricToneClass[metric.tone ?? "cyan"])}>
          <span className="absolute inset-1 rounded-full border border-current/20" />
          <span className="absolute inset-[-5px] rounded-full border border-current/15 border-dashed" />
          {metric.icon ? <span className="relative text-current">{metric.icon}</span> : null}
        </div>
        <div className="min-w-[8.5rem] flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="line-clamp-1 min-w-0 text-xs font-medium text-muted">{cleanDisplayCopy(metric.label)}</p>
            {metric.risk ? <RiskLevelBadge level={metric.risk} /> : null}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
            <p className="break-words text-[1.35rem] font-semibold leading-none text-ink sm:text-2xl">{cleanDisplayCopy(metric.value)}</p>
            {metric.unit ? <span className="pb-0.5 text-xs text-muted">{cleanDisplayCopy(metric.unit)}</span> : null}
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted">{cleanDisplayCopy(metric.trend ?? metric.hint)}</p>
        </div>
        <span className="ml-auto inline-flex min-h-8 shrink-0 items-center rounded-[4px] border border-cyan-300/30 bg-cyan-300/8 px-2 py-1 text-xs font-medium text-cyan-100">
          {cleanDisplayCopy(metric.status ?? "在线")}
        </span>
      </div>
    </article>
  );
}
