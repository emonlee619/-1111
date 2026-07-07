import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessPage } from "@/components/pages/BusinessPage";
import { OutburstIntegrationPage } from "@/components/pages/OutburstIntegrationPage";
import { MetricStrip } from "@/components/cockpit/MetricStrip";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { routeMetaByPath } from "@/config/routeMeta";
import { businessPageByPath } from "@/data/businessPages";
import { isOutburstIntegrationPath } from "@/lib/outburstRoutes";
import { cleanDisplayCopy } from "@/utils/displayText";

export function PageScaffold({ routePath, routeParams }: { routePath: string; routeParams?: Record<string, string> }) {
  const meta = routeMetaByPath[routePath];

  if (!meta) {
    return (
      <EmptyState
        title="路由元数据缺失"
        description={`请在 routeMeta.ts 中补齐 ${routePath} 的页面定位和 mock 展示内容。`}
      />
    );
  }

  const businessContent = businessPageByPath[routePath];

  if (isOutburstIntegrationPath(routePath)) {
    return <OutburstIntegrationPage meta={meta} routePath={routePath} routeParams={routeParams} content={businessContent} />;
  }

  if (businessContent) {
    return <BusinessPage meta={meta} content={businessContent} routeParams={routeParams} />;
  }

  return (
    <div className="min-w-0">
      <PageHeader title={meta.title} module={meta.module} description={meta.description} status={meta.status} />

      <MetricStrip metrics={meta.metrics} />

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        {meta.cards.map((card) => (
          <ConsoleCard key={`${meta.path}-${card.title}`} title={card.title} description={card.description}>
            <StatusBadge tone={card.tone ?? "neutral"}>{card.status ?? "mock 展示"}</StatusBadge>
          </ConsoleCard>
        ))}
      </div>

      {meta.workflowSteps ? (
        <ConsoleCard title="固定八步闭环" description="隐患排查治理流程顺序固定，复盘独立在 /double-prevention/review。" className="mt-5">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {meta.workflowSteps.map((step, index) => (
              <div key={step} className="rounded-[18px] border border-line bg-card p-4">
                <p className="text-xs font-medium text-primary">步骤 {index + 1}</p>
                <p className="mt-2 text-lg font-semibold text-ink">{step}</p>
                <p className="mt-2 text-sm leading-6 text-muted">责任人、时间、材料、状态和下一步提示使用 mock 摘要展示。</p>
              </div>
            ))}
          </div>
        </ConsoleCard>
      ) : null}

      {meta.notes?.length ? (
        <ConsoleCard title="边界说明" className="mt-5">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            {meta.notes.map((note) => (
              <li key={note}>• {cleanDisplayCopy(note)}</li>
            ))}
          </ul>
        </ConsoleCard>
      ) : null}
    </div>
  );
}
