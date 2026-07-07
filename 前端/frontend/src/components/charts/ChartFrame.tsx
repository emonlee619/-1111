"use client";

import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";

export function ChartFrame({
  title,
  description,
  children,
  footer,
  isEmpty,
  emptyDescription,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: string;
  isEmpty?: boolean;
  emptyDescription?: string;
}) {
  return (
    <ConsoleCard title={title} description={description}>
      {isEmpty ? (
        <ChartEmptyState description={emptyDescription} />
      ) : (
        <div className="console-scrollbar overflow-x-auto">
          <div className="h-64 min-w-0 sm:h-72">{children}</div>
        </div>
      )}
      {footer ? <p className="mt-3 text-xs leading-5 text-muted">{footer}</p> : null}
    </ConsoleCard>
  );
}
