import { RiskLevelBadge } from "./RiskLevelBadge";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { MetricCardModel } from "@/types/navigation";

export function MetricCard({ metric }: { metric: MetricCardModel }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-card border border-line bg-card p-4 shadow-soft transition hover:border-orange-200/80 hover:shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium text-muted">{cleanDisplayCopy(metric.label)}</p>
        {metric.risk ? <RiskLevelBadge level={metric.risk} /> : null}
      </div>
      <p className="mt-4 break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{cleanDisplayCopy(metric.value)}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{cleanDisplayCopy(metric.hint)}</p>
      {metric.trend ? <p className="mt-2 text-xs font-medium text-primary">{cleanDisplayCopy(metric.trend)}</p> : null}
    </article>
  );
}
