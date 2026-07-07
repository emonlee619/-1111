import { TriangleAlert } from "lucide-react";

export function ErrorState({
  title = "暂未找到可展示内容",
  description = "请检查筛选条件或确认当前 mock id 是否存在。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-card border border-red-200 bg-red-50/60 px-6 py-8 text-center">
      <TriangleAlert className="mb-3 text-red-600" size={26} />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
