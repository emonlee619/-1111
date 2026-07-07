import { CircleDashed } from "lucide-react";

export function EmptyState({
  title = "暂无可展示数据",
  description = "当前页面使用 mock 信息结构，不连接真实后端。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-card border border-dashed border-line bg-card px-6 py-8 text-center">
      <CircleDashed className="mb-3 text-primary" size={28} />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
