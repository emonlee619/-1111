import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { CockpitAction, HeroLegendItem } from "@/types/cockpit";

type CockpitHeroPanelProps = {
  title: string;
  description?: string;
  modeLabel?: string;
  modes?: string[];
  activeMode?: string;
  legend?: HeroLegendItem[];
  actions?: CockpitAction[];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

const legendToneClass: Record<NonNullable<HeroLegendItem["tone"]>, string> = {
  primary: "bg-primary text-[#03101f]",
  neutral: "bg-slate-400",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

function CockpitHeroAction({ action }: { action: CockpitAction }) {
  const className = cn(
    "cockpit-chamfer-sm inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[4px] border px-2.5 text-xs font-medium transition sm:min-h-8",
    action.tone === "primary"
      ? "border-cyan-200/70 bg-cyan-300/90 text-[#03101f] shadow-[0_0_18px_rgba(34,211,238,0.28)] hover:bg-cyan-200"
      : "border-cyan-300/25 bg-cyan-300/8 text-muted hover:border-cyan-300/55 hover:text-ink",
    action.disabled && "cursor-not-allowed opacity-55",
  );

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={className} aria-label={action.ariaLabel}>
        {action.icon}
        {cleanDisplayCopy(action.label)}
      </Link>
    );
  }

  return (
    <button className={className} onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel}>
      {action.icon}
      {cleanDisplayCopy(action.label)}
    </button>
  );
}

export function CockpitHeroPanel({
  title,
  description,
  modeLabel = "模式",
  modes = [],
  activeMode,
  legend = [],
  actions = [],
  children,
  className,
  contentClassName,
}: CockpitHeroPanelProps) {
  return (
    <section className={cn("cockpit-chamfer-lg relative flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-[var(--mine-border-strong)] bg-[#04162b]/86 shadow-[inset_0_0_32px_rgba(34,211,238,0.07),0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-2xl", className)}>
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-cyan-200/80 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
      <span className="pointer-events-none absolute left-1/2 top-10 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
      <header className="relative z-10 flex min-w-0 flex-col gap-3 border-b border-cyan-300/16 bg-[#03101f]/32 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-base font-semibold text-ink">{cleanDisplayCopy(title)}</h2>
            <span className="rounded-[4px] border border-cyan-300/25 bg-cyan-300/8 px-2 py-1 text-[11px] text-primary">
              {cleanDisplayCopy(modeLabel)}
            </span>
          </div>
          {description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{cleanDisplayCopy(description)}</p> : null}
        </div>
        <div className="console-scrollbar flex max-w-full shrink-0 items-center gap-2 overflow-x-auto pb-1">
          {modes.map((mode) => (
            <button
              key={mode}
              className={cn(
                "cockpit-chamfer-sm min-h-10 shrink-0 rounded-[4px] border px-2.5 text-xs transition sm:min-h-8",
                mode === activeMode
                  ? "border-cyan-200/70 bg-cyan-300/18 text-ink shadow-[0_0_14px_rgba(34,211,238,0.22)]"
                  : "border-cyan-300/18 bg-[#071b32]/78 text-muted hover:border-cyan-300/45 hover:text-ink",
              )}
              type="button"
            >
              {cleanDisplayCopy(mode)}
            </button>
          ))}
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-cyan-300/22 bg-cyan-300/8 text-muted transition hover:border-cyan-300/55 hover:text-ink sm:h-8 sm:w-8"
            type="button"
            aria-label="主视觉全屏区域"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          {actions.map((action) => (
            <CockpitHeroAction key={action.label} action={action} />
          ))}
        </div>
      </header>
      <div className={cn("relative min-h-[250px] flex-1 overflow-hidden p-3 sm:min-h-[300px] sm:p-4 xl:min-h-0", contentClassName)}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(72,160,220,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(72,160,220,0.055)_1px,transparent_1px)] bg-[size:36px_36px]" />
        {children}
      </div>
      {legend.length ? (
        <footer className="relative z-10 flex flex-wrap items-center gap-3 border-t border-cyan-300/16 bg-[#03101f]/38 px-4 py-2 text-xs text-muted">
          {legend.map((item) => (
            <span key={`${item.label}-${item.value ?? ""}`} className="inline-flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]", legendToneClass[item.tone ?? "primary"])} />
              <span>{cleanDisplayCopy(item.label)}</span>
              {item.value ? <span className="font-semibold text-ink">{cleanDisplayCopy(item.value)}</span> : null}
            </span>
          ))}
        </footer>
      ) : null}
    </section>
  );
}
