"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { DetailDrawerSection } from "@/types/cockpit";

type DetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  sections?: DetailDrawerSection[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

function renderDisplayCopy(value: React.ReactNode) {
  return typeof value === "string" ? cleanDisplayCopy(value) : value;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  sections = [],
  children,
  footer,
  className,
}: DetailDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 cursor-default bg-[#020815]/70 backdrop-blur-sm"
        aria-label="关闭详情抽屉"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[min(100vw,36rem)] flex-col border-l border-line bg-[var(--mine-bg-panel-solid)] shadow-card",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:gap-4 sm:p-5">
          <div className="min-w-0">
            <h2 id="detail-drawer-title" className="break-words text-lg font-semibold text-ink">
              {cleanDisplayCopy(title)}
            </h2>
            {description ? <p className="mt-2 text-sm leading-6 text-muted">{cleanDisplayCopy(description)}</p> : null}
          </div>
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-muted transition hover:border-[var(--mine-border-strong)] hover:text-primary"
            aria-label="关闭"
            onClick={() => onOpenChange(false)}
          >
            <X size={17} />
          </button>
        </div>
        <div className="console-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4">
            {sections.map((section) => (
              <section key={section.title} className="rounded-card border border-line bg-card p-4">
                <h3 className="text-sm font-semibold text-ink">{cleanDisplayCopy(section.title)}</h3>
                {section.description ? <p className="mt-1 text-sm leading-6 text-muted">{cleanDisplayCopy(section.description)}</p> : null}
                {section.items?.length ? (
                  <dl className="mt-3 grid gap-3">
                    {section.items.map((item) => (
                      <div key={item.label} className="grid gap-1">
                        <dt className="text-xs font-medium text-muted">{cleanDisplayCopy(item.label)}</dt>
                        <dd className="break-words text-sm text-ink">{renderDisplayCopy(item.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {section.children ? <div className="mt-3">{section.children}</div> : null}
              </section>
            ))}
            {children}
          </div>
        </div>
        {footer ? <div className="border-t border-line p-5">{footer}</div> : null}
      </aside>
    </div>
  );
}
