import { cn } from "@/lib/cn";
import { riskLevelLabels, type RiskLevel } from "@/types/risk";

const riskClass: Record<RiskLevel, string> = {
  low: "border-blue-200 bg-blue-50 text-blue-700",
  normal: "border-yellow-200 bg-yellow-50 text-yellow-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-5", riskClass[level])}>
      {riskLevelLabels[level]}
    </span>
  );
}
