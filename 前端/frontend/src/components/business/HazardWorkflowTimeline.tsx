import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { WorkflowStep } from "@/types/business";

const statusText: Record<WorkflowStep["status"], string> = {
  done: "已完成",
  active: "进行中",
  pending: "未开始",
  blocked: "受阻",
};

export function HazardWorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ConsoleCard title="八步闭环流程时间线" description="固定顺序：整理、分析、通报、整改、反馈、验收、审查、销号。">
      <ol className="relative space-y-4">
        {steps.map((step, index) => (
          <li key={step.name} className="min-w-0 rounded-control border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-primary">步骤 {index + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{step.name}</h3>
              </div>
              <StatusBadge tone={step.status === "done" ? "success" : step.status === "active" ? "warning" : "neutral"}>
                {statusText[step.status]}
              </StatusBadge>
            </div>
            <dl className="mt-3 grid gap-2 text-sm leading-6 text-muted sm:grid-cols-2">
              <div><dt className="inline font-medium text-ink">责任人：</dt><dd className="inline">{step.owner}</dd></div>
              <div><dt className="inline font-medium text-ink">时间：</dt><dd className="inline">{step.time}</dd></div>
              <div><dt className="inline font-medium text-ink">材料：</dt><dd className="inline">{step.materialSummary}</dd></div>
              <div><dt className="inline font-medium text-ink">下一步：</dt><dd className="inline">{step.nextHint}</dd></div>
            </dl>
          </li>
        ))}
      </ol>
    </ConsoleCard>
  );
}
