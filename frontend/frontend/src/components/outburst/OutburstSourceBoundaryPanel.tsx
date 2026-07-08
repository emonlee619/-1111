import { CockpitSectionPanel } from "@/components/cockpit";
import { KeyValueList } from "@/components/ui/BusinessSections";
import { DYNAMIC_CHANNEL_TOTAL, PHYSICS_CONSTRAINED_CHANNEL_COUNT, REAL_SENSOR_CHANNEL_COUNT, formatObservedNodeCount } from "@/lib/outburstChannelPolicy";

export function OutburstSourceBoundaryPanel({ observedNodeCount }: { observedNodeCount?: number | null }) {
  return (
    <CockpitSectionPanel title="R/B/S 来源边界" badge="source boundary" tone="info">
      <div className="grid gap-3">
        <KeyValueList items={[
          {
            label: `R01-R${REAL_SENSOR_CHANNEL_COUNT}`,
            value: "真实传感器指标位",
            hint: "source_type=real_sensor，reliability_weight=1.0，可作为现场监测依据并进入报警、复核、处置闭环。",
          },
          {
            label: `B01-B${PHYSICS_CONSTRAINED_CHANNEL_COUNT}`,
            value: "物理约束生成/估计指标",
            hint: "source_type=physics_constrained，建议 reliability_weight=0.3-0.7，只能作为辅助前兆，不能替代真实监测。",
          },
          {
            label: "S01-S32",
            value: "静态风险项",
            hint: "source_type=static_prior 或 manual_check，作为风险先验和管控优先级，不占动态通道槽位。",
          },
          {
            label: "当前后端返回",
            value: formatObservedNodeCount(observedNodeCount),
            hint: `63 维是动态输入特征口径；页面节点数量仍以后端 meta/sensors/stats 实测返回为准。`,
          },
        ]} />
        <p className="rounded-[5px] border border-orange-300/20 bg-orange-400/10 p-3 text-xs leading-5 text-orange-50">
          B 指标是辅助前兆和模型解释线索，不得显示为真实监测，也不得单独作为断电、撤人或重大隐患确认依据。当前动态特征口径为 {DYNAMIC_CHANNEL_TOTAL} 维，S 静态风险项另行展示。
        </p>
      </div>
    </CockpitSectionPanel>
  );
}
