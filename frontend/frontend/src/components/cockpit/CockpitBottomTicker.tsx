import Link from "next/link";
import { Radio, RefreshCw } from "lucide-react";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { RiskLevel } from "@/types/risk";

type CockpitBottomTickerProps = {
  level: RiskLevel;
  summary: string;
  area: string;
  href: string;
  updatedAt: string;
  autoRefresh?: string;
  className?: string;
};

export function CockpitBottomTicker({
  level,
  summary,
  area,
  href,
  updatedAt,
  autoRefresh = "自动刷新中",
  className,
}: CockpitBottomTickerProps) {
  return (
    <section className={cn("cockpit-chamfer-md relative min-w-0 overflow-hidden rounded-[7px] border border-[var(--mine-border-strong)] bg-[#061a31]/84 px-4 py-3 shadow-[inset_0_0_24px_rgba(34,211,238,0.07),0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-2xl", className)}>
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-cyan-200/70 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
      <div className="relative flex flex-col gap-3 text-sm lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 text-primary">
          <Radio className="h-4 w-4" aria-hidden />
          <span className="font-semibold text-ink">最新预警</span>
          <RiskLevelBadge level={level} />
        </div>
        <p className="min-w-0 flex-1 truncate text-ink">{cleanDisplayCopy(summary)}</p>
        <span className="shrink-0 rounded-[4px] border border-cyan-300/22 bg-cyan-300/8 px-2 py-1 text-xs text-muted">{cleanDisplayCopy(area)}</span>
        <Link
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center rounded-[4px] border border-cyan-300/28 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-cyan-300/60 hover:text-ink sm:min-h-0"
        >
          查看详情
        </Link>
        <span className="shrink-0 text-xs text-muted">更新时间：{cleanDisplayCopy(updatedAt)}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-success">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {cleanDisplayCopy(autoRefresh)}
        </span>
      </div>
    </section>
  );
}
