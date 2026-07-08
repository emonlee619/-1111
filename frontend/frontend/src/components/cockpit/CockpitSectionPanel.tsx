import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { StatusTone } from "@/types/risk";

type CockpitSectionPanelProps = {
  title: string;
  eyebrow?: string;
  badge?: string;
  tone?: StatusTone;
  moreHref?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "blueBeam";
};

export function CockpitSectionPanel({
  title,
  eyebrow,
  badge,
  tone = "neutral",
  moreHref,
  children,
  className,
  contentClassName,
  variant = "default",
}: CockpitSectionPanelProps) {
  const blueBeam = variant === "blueBeam";

  return (
    <section className={cn("cockpit-chamfer-sm relative min-w-0 overflow-hidden rounded-[7px] border border-[var(--mine-border)] bg-[#061a31]/78 shadow-[inset_0_0_20px_rgba(34,211,238,0.05),0_14px_32px_rgba(0,0,0,0.22)] backdrop-blur-2xl", blueBeam && "border-cyan-300/28 bg-[#061a31]/84 shadow-[inset_0_0_24px_rgba(34,211,238,0.07),0_16px_34px_rgba(0,0,0,0.25)]", className)}>
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-cyan-200/60 shadow-[0_0_12px_rgba(34,211,238,0.65)]" />
      <header
        className={cn(
          "relative flex min-h-11 items-center justify-between gap-3 border-b border-cyan-300/18 bg-cyan-300/[0.045] px-3 py-2",
          blueBeam && "section-title-beam min-h-12 bg-[linear-gradient(90deg,rgba(14,165,233,0.18),rgba(14,165,233,0.055)_44%,transparent)] py-2.5",
        )}
      >
        <div className={cn("min-w-0", blueBeam && "flex items-center gap-2")}>
          {blueBeam ? <span className="section-title-beam__mark" aria-hidden /> : null}
          <div className="min-w-0">
            {eyebrow ? <p className="truncate text-[11px] font-medium text-primary">{cleanDisplayCopy(eyebrow)}</p> : null}
            <div className="flex min-w-0 items-center gap-2">
              <h2 className={cn("truncate text-sm font-semibold text-ink", blueBeam && "section-title-beam__title text-[15px]")}>{cleanDisplayCopy(title)}</h2>
              {blueBeam ? (
                <span className="section-title-beam__ticks shrink-0" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge ? <StatusBadge tone={tone}>{cleanDisplayCopy(badge)}</StatusBadge> : null}
          {moreHref ? (
            <Link
              href={moreHref}
              className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-cyan-300/20 bg-cyan-300/8 px-2 text-xs text-muted transition hover:border-cyan-300/50 hover:text-ink"
            >
              更多
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </header>
      <div className={cn("relative p-3", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
