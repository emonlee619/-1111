"use client";

import { ListChecks } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useKb } from "@/lib/kb/useKb";
import { kbApi } from "@/lib/kb/apiClient";
import type { KbReviewTask } from "@/types/kb";

const HIGHLIGHT = ["B01", "B0", "物理约束", "静态风险", "管控", "报警", "断电", "撤人", "PDF", "解析", "法规", "标准", "版本", "核验"];

function isHighlight(reason: string | null): boolean {
  if (!reason) return false;
  return HIGHLIGHT.some((kw) => reason.includes(kw));
}

export function KbReviewTaskPanel() {
  const s = useKb<KbReviewTask[]>(() => kbApi.reviewTasks(300), []);

  return (
    <CockpitSectionPanel title="审核任务区" badge="review_tasks" variant="blueBeam">
      {s.state === "loading" ? <p className="text-sm text-muted">加载审核任务…</p> : null}
      {s.state === "error" ? <p className="text-sm text-red-200">{s.message}</p> : null}
      {s.state === "ok" ? <ReviewGroups tasks={s.data} /> : null}
    </CockpitSectionPanel>
  );
}

function ReviewGroups({ tasks }: { tasks: KbReviewTask[] }) {
  const groups = new Map<string, KbReviewTask[]>();
  for (const t of tasks) {
    const key = t.review_reason || "未分类";
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => {
    // 高敏原因优先
    const ah = isHighlight(a[0]) ? 1 : 0;
    const bh = isHighlight(b[0]) ? 1 : 0;
    if (bh !== ah) return bh - ah;
    return b[1].length - a[1].length;
  });
  const highlightCount = tasks.filter((t) => isHighlight(t.review_reason)).length;

  if (sorted.length === 0) return <p className="text-sm text-muted">暂无审核任务。</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <ListChecks className="h-4 w-4 text-primary" />
        <span>共 {tasks.length} 条审核任务，{sorted.length} 类原因</span>
        <StatusBadge tone="warning">高敏 {highlightCount}</StatusBadge>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {sorted.map(([reason, list]) => {
          const hot = isHighlight(reason);
          return (
            <div
              key={reason}
              className={
                "rounded-[5px] border p-2 " +
                (hot ? "border-orange-400/55 bg-orange-400/10" : "border-cyan-300/18 bg-[#031020]/72")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-ink" title={reason}>{reason}</span>
                <StatusBadge tone={hot ? "warning" : "neutral"}>{list.length}</StatusBadge>
              </div>
              <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                {list.slice(0, 20).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-[11px] text-muted">
                    <StatusBadge tone={t.review_status === "pending" ? "warning" : t.review_status === "approved" ? "success" : "neutral"}>
                      {t.review_status}
                    </StatusBadge>
                    {t.card_code ? <span className="font-mono text-ink">{t.card_code}</span> : null}
                    <span className="truncate">{t.target_type}</span>
                  </li>
                ))}
                {list.length > 20 ? <li className="text-[10px] text-muted">…另有 {list.length - 20} 条</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
