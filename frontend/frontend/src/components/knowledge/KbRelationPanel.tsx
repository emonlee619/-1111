"use client";

import { GitBranch } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useKb } from "@/lib/kb/useKb";
import { kbApi } from "@/lib/kb/apiClient";
import type { KbRelation } from "@/types/kb";

const RELATION_LABEL: Record<string, string> = {
  controlled_by: "指标 → 管控措施",
  triggers: "管控措施 → 指标",
  based_on: "基于（指标/约束）",
  explains: "解释（报警规则）",
  supports: "支持（静态风险 → 物理约束）",
  related_to: "同类关联",
};

export function KbRelationPanel() {
  const s = useKb<KbRelation[]>(() => kbApi.relations(500), []);

  return (
    <CockpitSectionPanel title="关系图谱区" badge="knowledge_relations" variant="blueBeam">
      {s.state === "loading" ? <p className="text-sm text-muted">加载关系…</p> : null}
      {s.state === "error" ? <p className="text-sm text-red-200">{s.message}</p> : null}
      {s.state === "ok" ? <RelationGroups relations={s.data} /> : null}
    </CockpitSectionPanel>
  );
}

function RelationGroups({ relations }: { relations: KbRelation[] }) {
  const groups = new Map<string, KbRelation[]>();
  for (const r of relations) {
    const list = groups.get(r.relation_type) ?? [];
    list.push(r);
    groups.set(r.relation_type, list);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

  if (sorted.length === 0) return <p className="text-sm text-muted">暂无关系数据。</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <GitBranch className="h-4 w-4 text-primary" />
        <span>共 {relations.length} 条关系，按类型分组：</span>
        {sorted.map(([type, list]) => (
          <StatusBadge key={type} tone="info">
            {RELATION_LABEL[type] ?? type} · {list.length}
          </StatusBadge>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {sorted.map(([type, list]) => (
          <div key={type} className="rounded-[5px] border border-cyan-300/18 bg-[#031020]/72 p-2">
            <p className="text-xs font-medium text-primary">{RELATION_LABEL[type] ?? type}</p>
            <ul className="mt-1 max-h-44 space-y-1 overflow-y-auto">
              {list.slice(0, 40).map((r) => (
                <li key={r.id} className="flex items-center gap-1 text-[11px] text-muted">
                  <span className="font-mono text-ink">{r.source_card_code}</span>
                  <span className="text-primary">→</span>
                  <span className="font-mono text-ink">{r.target_card_code}</span>
                  {r.confidence_level ? <span className="text-[10px] text-muted">({r.confidence_level})</span> : null}
                </li>
              ))}
              {list.length > 40 ? <li className="text-[10px] text-muted">…另有 {list.length - 40} 条</li> : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
