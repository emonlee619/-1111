import { MetricCard } from "@/components/ui/MetricCard";
import { cn } from "@/lib/cn";
import type { CockpitMetric } from "@/types/cockpit";

type MetricStripProps = {
  metrics: CockpitMetric[];
  className?: string;
  dense?: boolean;
};

export function MetricStrip({ metrics, className, dense = false }: MetricStripProps) {
  if (!metrics.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-w-0 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4",
        metrics.length >= 5 && "2xl:grid-cols-5",
        dense && "gap-3",
        className,
      )}
    >
      {metrics.map((metric) => (
        <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} />
      ))}
    </div>
  );
}
