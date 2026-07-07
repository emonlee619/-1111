import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { CockpitAction, HeroLegendItem } from "@/types/cockpit";

type HeroPanelProps = {
  title: string;
  description?: string;
  status?: string;
  legend?: HeroLegendItem[];
  actions?: CockpitAction[];
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

const toneClass: Record<NonNullable<HeroLegendItem["tone"]>, string> = {
  primary: "bg-primary text-[#03101f]",
  neutral: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

function ActionButton({ action }: { action: CockpitAction }) {
  const className = cn(
    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control border px-3 py-2 text-sm font-medium transition",
    action.tone === "primary"
      ? "border-[var(--mine-border-strong)] bg-primary text-[#03101f] shadow-glow hover:brightness-110"
      : "border-line bg-surface text-muted hover:border-[var(--mine-border-strong)] hover:text-ink",
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

export function HeroPanel({
  title,
  description,
  status,
  legend = [],
  actions = [],
  children,
  className,
  contentClassName,
}: HeroPanelProps) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-card border border-line bg-card p-4 shadow-card backdrop-blur-2xl sm:p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-base font-semibold text-ink">{cleanDisplayCopy(title)}</h2>
            {status ? <StatusBadge tone="info">{cleanDisplayCopy(status)}</StatusBadge> : null}
          </div>
          {description ? <p className="mt-2 text-sm leading-6 text-muted">{cleanDisplayCopy(description)}</p> : null}
        </div>
        {actions.length ? (
          <div className="console-scrollbar flex max-w-full items-center gap-2 overflow-x-auto pb-1">
            {actions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
          </div>
        ) : null}
      </div>
      {legend.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          {legend.map((item) => (
            <span key={`${item.label}-${item.value ?? ""}`} className="inline-flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", toneClass[item.tone ?? "primary"])} />
              <span>{cleanDisplayCopy(item.label)}</span>
              {item.value ? <span className="font-semibold text-ink">{cleanDisplayCopy(item.value)}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
      <div className={cn("mt-4 min-h-[240px] overflow-hidden rounded-[16px] border border-line bg-panel-soft p-3 sm:min-h-[280px] sm:p-4", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
