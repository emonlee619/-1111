import { CockpitSectionPanel } from "@/components/cockpit";
import { TimelineList } from "@/components/ui/BusinessSections";
import { getDisposalLevel, type OutburstSourceType } from "@/lib/outburstBusinessRules";
import type { RiskLevel } from "@/types/risk";

const adviceBySource: Record<OutburstSourceType, string[]> = {
  real_sensor: [
    "现场复核传感器当前值、标校状态、安装位置和联动测点。",
    "安排瓦检、测风、传感器调校、通风设施和抽采系统检查。",
    "如真实传感器持续异常，按后端规则、矿井制度和调度指令升级处置。",
  ],
  physics_constrained: [
    "回查支撑真实曲线，确认是否存在同步异常。",
    "安排钻屑、瓦斯压力、微震、声发射、顶板或围岩专项复核。",
    "仅作为辅助前兆进入待复核，不直接形成断电、撤人或重大隐患结论。",
  ],
  static_prior: [
    "复核地质、通风、抽采、瓦斯参数、制度执行和历史隐患资料。",
    "组织人工巡检，形成整改任务、责任人、期限和验收记录。",
    "静态风险用于管控优先级和场景修正，不替代实时监测。",
  ],
  manual_check: [
    "核对人工巡检记录、现场照片、责任人签认和班组交接。",
    "将人工确认问题纳入隐患治理闭环并保留复核材料。",
    "人工巡检结论仍需按制度审核后形成正式处置意见。",
  ],
  backend_reported: [
    "先补齐 source_type、slot 或 sensor_id。",
    "人工确认数据来源后再选择真实传感器、生成/估计或静态风险模板。",
    "来源确认前不得作为正式处置结论。",
  ],
  unknown: [
    "缺少来源字段，需数据管理员核查后端映射。",
    "仅保留为待确认线索。",
    "不得自动进入处置闭环。",
  ],
};

export function OutburstDisposalAdvicePanel({
  sourceType,
  riskLevel,
}: {
  sourceType: OutburstSourceType;
  riskLevel?: RiskLevel | string;
}) {
  const level = getDisposalLevel(sourceType, riskLevel);
  const items = adviceBySource[sourceType].map((description, index) => ({
    time: `建议 ${index + 1}`,
    title: level,
    description,
    tone: index === 0 ? "warning" as const : "neutral" as const,
  }));

  return (
    <CockpitSectionPanel title="处置建议" badge={level} tone="warning">
      <TimelineList items={items} />
    </CockpitSectionPanel>
  );
}
