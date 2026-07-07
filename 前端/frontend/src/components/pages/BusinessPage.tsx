import { PageHeader } from "@/components/layout/PageHeader";
import { MetricStrip } from "@/components/cockpit/MetricStrip";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { SectionGrid } from "@/components/ui/BusinessSections";
import { isStage4Path, Stage4CoreShowcasePage } from "@/components/pages/Stage4CoreShowcasePage";
import { isStage5Path, Stage5ModuleShowcasePage } from "@/components/pages/Stage5ModuleShowcasePage";
import { isStage6Path, Stage6SecondaryWorkstationPage } from "@/components/pages/Stage6SecondaryWorkstationPage";
import { MonitoringWorkstationPage } from "@/components/pages/MonitoringWorkstationPage";
import { Stage3BusinessPage } from "@/components/pages/Stage3BusinessPage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent } from "@/types/business";
import type { RouteMeta } from "@/types/navigation";

const stage3Paths = new Set([
  "/dashboard",
  "/monitoring/realtime",
  "/warning/events",
  "/warning/events/[id]",
  "/source-tracing",
  "/source-tracing/attention",
  "/regions",
  "/regions/[regionId]",
  "/double-prevention",
  "/double-prevention/hazard-workflow",
  "/data/augmentation",
  "/data/features",
  "/data/datasets",
  "/model/evaluation",
]);

const monitoringWorkstationPaths = new Set(["/monitoring/realtime", "/monitoring/channels", "/warning/events"]);

export function BusinessPage({
  meta,
  content,
  routeParams,
}: {
  meta: RouteMeta;
  content: BusinessPageContent;
  routeParams?: Record<string, string>;
}) {
  if (isStage4Path(content.path)) {
    return <Stage4CoreShowcasePage meta={meta} content={content} />;
  }

  if (monitoringWorkstationPaths.has(content.path)) {
    return <MonitoringWorkstationPage meta={meta} content={content} />;
  }

  if (isStage5Path(content.path)) {
    return <Stage5ModuleShowcasePage meta={meta} content={content} />;
  }

  if (isStage6Path(content.path)) {
    return <Stage6SecondaryWorkstationPage meta={meta} content={content} routeParams={routeParams} />;
  }

  if (stage3Paths.has(content.path)) {
    return <Stage3BusinessPage meta={meta} content={content} routeParams={routeParams} />;
  }

  return (
    <div>
      <PageHeader title={meta.title} module={meta.module} description={meta.description} status={meta.status} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">业务工作台</StatusBadge>
        <StatusBadge tone="neutral">{content.dataSource === "mock" ? "mock 数据契约" : "静态说明"}</StatusBadge>
        <StatusBadge tone="neutral">更新时间：{content.updatedAt}</StatusBadge>
      </div>

      <MetricStrip metrics={content.metrics} />

      <SectionGrid sections={content.sections} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ConsoleCard title="状态说明" description="用于说明页面当前能力与 mock 状态。">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            {content.statusNotes.map((note) => (
              <li key={note}>- {cleanDisplayCopy(note)}</li>
            ))}
          </ul>
        </ConsoleCard>
        <ConsoleCard title="边界说明" description="当前页面不越界到真实业务能力。">
          <ul className="space-y-2 text-sm leading-6 text-muted">
            {content.boundaryNotes.map((note) => (
              <li key={note}>- {cleanDisplayCopy(note)}</li>
            ))}
          </ul>
        </ConsoleCard>
      </div>
    </div>
  );
}
