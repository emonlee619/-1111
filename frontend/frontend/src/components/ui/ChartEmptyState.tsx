import { BarChart3 } from "lucide-react";

export function ChartEmptyState({
  title = "暂无图表数据",
  description = "当前筛选条件下没有可绘制的 mock 记录。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-control border border-dashed border-line bg-card/80 px-6 py-8 text-center">
      <BarChart3 className="mb-3 text-primary" size={28} />
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
