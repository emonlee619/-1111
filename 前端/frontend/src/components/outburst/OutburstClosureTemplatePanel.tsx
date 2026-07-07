import { CockpitSectionPanel } from "@/components/cockpit";
import { KeyValueList, TimelineList } from "@/components/ui/BusinessSections";
import { getOutburstClosureTemplate } from "@/data/outburstClosureTemplates";
import { getClosureTemplateType, type OutburstSourceType } from "@/lib/outburstBusinessRules";
import type { TimelineItem } from "@/types/business";

function templateTimeline(items: string[], title: string): TimelineItem[] {
  return items.map((description, index) => ({
    time: `步骤 ${index + 1}`,
    title,
    description,
    tone: index === 0 ? "info" : "neutral",
  }));
}

export function OutburstClosureTemplatePanel({ sourceType }: { sourceType: OutburstSourceType }) {
  const template = getOutburstClosureTemplate(getClosureTemplateType(sourceType));
  const timeline = [
    ...templateTimeline(template.verification, "现场复核"),
    ...templateTimeline(template.disposalActions, "处置动作"),
    ...templateTimeline(template.escalationConditions, "升级条件"),
  ];

  return (
    <CockpitSectionPanel title="隐患闭环模板" badge={template.id} tone={sourceType === "physics_constrained" ? "warning" : "info"}>
      <div className="grid gap-4">
        <KeyValueList items={[
          { label: "模板", value: template.title },
          { label: "触发来源", value: template.triggerSource },
          { label: "关联通道", value: template.relatedChannels },
          { label: "责任人", value: template.owner },
          { label: "闭环状态", value: template.closureStatus },
          { label: "边界", value: template.boundaryNotice },
        ]} />
        <TimelineList items={timeline} />
      </div>
    </CockpitSectionPanel>
  );
}
