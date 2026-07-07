import { CockpitSectionPanel } from "@/components/cockpit";
import { DataTableShell, KeyValueList } from "@/components/ui/BusinessSections";
import { getContributionExplanation, type ContributionExplanation } from "@/lib/outburstBusinessRules";
import type { OutburstWarning } from "@/lib/outburstApi";

type ContributionRow = {
  sensor_id: string;
  contribution: number;
  rank: number;
  source_type?: string;
  slot?: string;
};

function summarizeBySource(rows: ContributionExplanation[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.sourceLabel] = (acc[row.sourceLabel] ?? 0) + 1;
    return acc;
  }, {});
}

export function OutburstRiskExplanationPanel({
  warning,
  contributions,
}: {
  warning?: OutburstWarning;
  contributions: ContributionRow[];
}) {
  const explained = contributions.map(getContributionExplanation);
  const summary = summarizeBySource(explained);

  return (
    <CockpitSectionPanel title="风险解释" badge={warning?.event_id ?? "no event"} tone="info">
      {warning ? (
        <div className="grid gap-4">
          <KeyValueList items={[
            { label: "动态风险", value: warning.dynamic_risk.toFixed(3), hint: "来自动态通道和模型推理的风险分量。" },
            { label: "静态风险", value: warning.static_risk.toFixed(3), hint: "来自静态风险项、场景先验或后端配置的风险分量。" },
            { label: "综合风险", value: warning.combined_risk.toFixed(3), hint: "后端综合输出；前端不重新计算风险结论。" },
            { label: "贡献来源", value: Object.entries(summary).map(([label, count]) => `${label} ${count}`).join(" / ") || "等待后端返回", hint: "贡献节点按 R/B/S/后端返回保守分类。" },
          ]} />
          <DataTableShell
            columns={[
              { key: "rank", label: "排名" },
              { key: "sensor", label: "节点" },
              { key: "source", label: "来源" },
              { key: "contribution", label: "贡献度" },
              { key: "boundary", label: "业务边界" },
            ]}
            rows={explained.slice(0, 12).map((row) => ({
              rank: row.rank,
              sensor: row.sensorId,
              source: row.sourceLabel,
              contribution: row.contribution.toFixed(6),
              boundary: row.disposalBoundary,
            }))}
          />
          <p className="rounded-[5px] border border-cyan-300/16 bg-cyan-300/8 p-3 text-xs leading-5 text-muted">
            模型贡献度用于解释模型关注的线索，不等于事故原因，也不替代现场复核、法规判定和人工确认。
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted">等待后端返回预警事件后展示风险解释。</p>
      )}
    </CockpitSectionPanel>
  );
}
