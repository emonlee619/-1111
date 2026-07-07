import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { StatusTone } from "@/types/risk";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-line bg-surface text-muted",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-orange-200 bg-orange-50 text-primary",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  const content = typeof children === "string" ? cleanDisplayCopy(children) : children;

  return (
    <span className={cn("inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-5", toneClass[tone])}>
      {content}
    </span>
  );
}
