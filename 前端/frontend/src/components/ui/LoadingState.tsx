import { LoaderCircle } from "lucide-react";

export function LoadingState({
  title = "正在加载 mock 数据",
  description = "当前为本地演示状态，真实接口将在后续阶段接入。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-card border border-line bg-card px-6 py-8 text-center">
      <LoaderCircle className="mb-3 animate-spin text-primary" size={26} />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
