import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveTableWrapper } from "@/components/ui/ResponsiveTableWrapper";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessSection, KeyValueItem, TimelineItem, WorkflowStep } from "@/types/business";

function formatValue(value: KeyValueItem["value"]) {
  if (value === null) {
    return "未设置";
  }
  return cleanDisplayCopy(String(value));
}

export function KeyValueList({ items }: { items: KeyValueItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-control border border-line bg-card p-4">
          <dt className="text-xs font-medium text-muted">{cleanDisplayCopy(item.label)}</dt>
          <dd className="mt-2 break-words text-base font-semibold text-ink">{formatValue(item.value)}</dd>
          {item.hint ? <p className="mt-2 text-xs leading-5 text-muted">{cleanDisplayCopy(item.hint)}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function DataTableShell({
  columns,
  rows,
  rowClassName,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, KeyValueItem["value"]>[];
  rowClassName?: (row: Record<string, KeyValueItem["value"]>, rowIndex: number) => string;
}) {
  return (
    rows.length ? (
    <ResponsiveTableWrapper>
      <table className="min-w-[640px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border-b border-line px-3 py-2 text-xs font-semibold text-muted">
                {cleanDisplayCopy(column.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${String(row[columns[0]?.key ?? "id"])}`} className={rowClassName?.(row, rowIndex)}>
              {columns.map((column) => (
                <td key={column.key} className="border-b border-line/70 px-3 py-3 text-ink">
                  {formatValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTableWrapper>
    ) : <EmptyState title="暂无表格记录" description="当前筛选条件下没有匹配的 mock 数据。" />
  );
}

export function TimelineList({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={`${item.time}-${item.title}`} className="min-w-0 rounded-control border border-line bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-primary">{item.time}</span>
            {item.tone ? <StatusBadge tone={item.tone}>{item.title}</StatusBadge> : <span className="font-semibold text-ink">{cleanDisplayCopy(item.title)}</span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{cleanDisplayCopy(item.description)}</p>
        </li>
      ))}
    </ol>
  );
}

export function WorkflowSteps({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <article key={step.name} className="min-w-0 rounded-control border border-line bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary">步骤 {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{step.name}</h3>
            </div>
            <StatusBadge tone={step.status === "done" ? "success" : step.status === "active" ? "warning" : "neutral"}>
              {cleanDisplayCopy(step.status)}
            </StatusBadge>
          </div>
          <dl className="mt-3 space-y-2 text-sm leading-6 text-muted">
            <div>
              <dt className="inline font-medium text-ink">责任人：</dt>
              <dd className="inline">{cleanDisplayCopy(step.owner)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-ink">时间：</dt>
              <dd className="inline">{cleanDisplayCopy(step.time)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-ink">材料：</dt>
              <dd className="inline">{cleanDisplayCopy(step.materialSummary)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-ink">下一步：</dt>
              <dd className="inline">{cleanDisplayCopy(step.nextHint)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function MockChartPlaceholder({ status, metrics }: { status: string; metrics?: KeyValueItem[] }) {
  return (
    <div className="rounded-control border border-dashed border-orange-200 bg-orange-50/40 p-5">
      <p className="text-sm font-semibold text-primary">{cleanDisplayCopy(status)}</p>
      <div className="mt-4 h-28 rounded-control border border-line bg-surface" aria-label="mock 图表容器" />
      {metrics?.length ? <div className="mt-4"><KeyValueList items={metrics} /></div> : null}
    </div>
  );
}

export function SectionGrid({ sections }: { sections: BusinessSection[] }) {
  return (
    <div className="mt-5 grid gap-5">
      {sections.map((section) => (
        <ConsoleCard key={`${section.kind}-${section.title}`} title={section.title} description={section.description}>
          {section.kind === "table" ? <DataTableShell columns={section.columns} rows={section.rows} /> : null}
          {section.kind === "detail" ? <KeyValueList items={section.items} /> : null}
          {section.kind === "list" ? (
            <ul className="space-y-2 text-sm leading-6 text-muted">
              {section.items.map((item) => (
                <li key={item}>- {cleanDisplayCopy(item)}</li>
              ))}
            </ul>
          ) : null}
          {section.kind === "timeline" ? <TimelineList items={section.items} /> : null}
          {section.kind === "workflow" ? <WorkflowSteps steps={section.steps} /> : null}
          {section.kind === "chart" ? <MockChartPlaceholder status={section.status} metrics={section.metrics} /> : null}
        </ConsoleCard>
      ))}
    </div>
  );
}
