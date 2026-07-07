import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveTableWrapper } from "@/components/ui/ResponsiveTableWrapper";
import type { ConfusionMatrixCell } from "@/types/business";

export function ConfusionMatrixCard({ cells }: { cells: ConfusionMatrixCell[] }) {
  const labels = Array.from(new Set(cells.flatMap((cell) => [cell.actual, cell.predicted])));
  const countFor = (actual: string, predicted: string) =>
    cells.find((cell) => cell.actual === actual && cell.predicted === predicted)?.count ?? 0;

  return (
    <ConsoleCard title="混淆矩阵组件" description="由 mock 模型评估字段渲染，不调用真实评估任务。">
      {cells.length ? (
      <ResponsiveTableWrapper>
        <table className="min-w-full border-separate border-spacing-0 text-center text-sm">
          <thead>
            <tr>
              <th className="border-b border-line px-3 py-3 text-left text-muted">实际 / 预测</th>
              {labels.map((label) => (
                <th key={label} className="border-b border-line px-3 py-3 text-muted">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((actual) => (
              <tr key={actual}>
                <th className="border-b border-line px-3 py-3 text-left font-semibold text-ink">{actual}</th>
                {labels.map((predicted) => (
                  <td key={predicted} className="border-b border-line px-3 py-3">
                    <span className="inline-flex min-w-12 justify-center rounded-control bg-orange-50 px-3 py-2 font-semibold text-primary">
                      {countFor(actual, predicted)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTableWrapper>
      ) : <EmptyState title="暂无混淆矩阵" description="当前 mock 评估结果未提供矩阵数据。" />}
    </ConsoleCard>
  );
}
