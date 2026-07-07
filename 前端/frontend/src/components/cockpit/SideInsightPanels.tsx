import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { InsightPanel } from "@/types/cockpit";

type SideInsightPanelsProps = {
  panels: InsightPanel[];
  className?: string;
};

export function SideInsightPanels({ panels, className }: SideInsightPanelsProps) {
  if (!panels.length) {
    return null;
  }

  return (
    <div className={cn("grid min-w-0 gap-4", className)}>
      {panels.map((panel) => (
        <ConsoleCard key={panel.title} title={panel.title} description={panel.description}>
          {panel.badge ? (
            <div className="mb-3">
              <StatusBadge tone={panel.tone ?? "neutral"}>{panel.badge}</StatusBadge>
            </div>
          ) : null}
          {panel.children}
        </ConsoleCard>
      ))}
    </div>
  );
}
