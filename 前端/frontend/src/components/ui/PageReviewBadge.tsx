import { MonitorCheck } from "lucide-react";

export function PageReviewBadge() {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium leading-5 text-primary">
      <MonitorCheck size={14} />
      视觉检查
    </span>
  );
}
