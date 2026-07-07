import Link from "next/link";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { DockStatusItem, QuickActionItem } from "@/types/cockpit";

type QuickActionDockProps = {
  actions?: QuickActionItem[];
  statusItems?: DockStatusItem[];
  ticker?: React.ReactNode;
  className?: string;
};

const statusToneClass: Record<NonNullable<DockStatusItem["tone"]>, string> = {
  primary: "text-primary",
  neutral: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

function QuickAction({ action }: { action: QuickActionItem }) {
  const className = cn(
    "flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-3 text-left transition hover:border-[var(--mine-border-strong)] hover:bg-primary-soft hover:shadow-glow",
    action.disabled && "cursor-not-allowed opacity-55",
  );
  const content = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{cleanDisplayCopy(action.label)}</span>
        {action.description ? <span className="mt-1 block line-clamp-1 text-xs text-muted">{cleanDisplayCopy(action.description)}</span> : null}
      </span>
      {action.status ? <span className="shrink-0 text-xs font-medium text-primary">{cleanDisplayCopy(action.status)}</span> : null}
    </>
  );

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={className} aria-label={action.ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel}>
      {content}
    </button>
  );
}

export function QuickActionDock({ actions = [], statusItems = [], ticker, className }: QuickActionDockProps) {
  if (!actions.length && !statusItems.length && !ticker) {
    return null;
  }

  return (
    <section className={cn("min-w-0 rounded-card border border-line bg-card p-3 shadow-soft backdrop-blur-2xl sm:p-4", className)}>
      {actions.length ? (
        <div className="grid min-w-0 gap-3 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {actions.map((action) => (
            <QuickAction key={action.label} action={action} />
          ))}
        </div>
      ) : null}
      {(statusItems.length || ticker) ? (
        <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-line pt-4 text-sm text-muted lg:flex-row lg:items-center lg:justify-between">
          {ticker ? <div className="min-w-0 flex-1 overflow-hidden leading-6 text-ink">{ticker}</div> : null}
          {statusItems.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {statusItems.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <span>{cleanDisplayCopy(item.label)}</span>
                  <span className={cn("font-semibold", statusToneClass[item.tone ?? "primary"])}>{cleanDisplayCopy(item.value)}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
