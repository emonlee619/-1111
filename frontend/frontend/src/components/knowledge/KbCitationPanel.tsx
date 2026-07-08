"use client";

import type { KbCitation, KbSearchResult } from "@/types/kb";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  citations: KbCitation[];
  retrieved?: KbSearchResult[];
};

/** 引用证据面板：展示 RAG 检索到的证据卡片与相似度。 */
export function KbCitationPanel({ citations, retrieved }: Props) {
  if (citations.length === 0) {
    return (
      <div className="rounded-[4px] border border-red-300/30 bg-red-300/[0.06] px-3 py-2 text-xs text-red-200">
        无引用证据——按业务硬约束，AI 不得输出确定结论。
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">引用证据（{citations.length}）</p>
      <ul className="grid gap-2 md:grid-cols-2">
        {citations.map((c) => {
          const isPhysics = c.source_type === "physics_constrained";
          return (
            <li key={c.card_code} className="rounded-[4px] border border-cyan-300/18 bg-cyan-300/[0.06] p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-primary">{c.card_code}</span>
                <StatusBadge tone={isPhysics ? "warning" : "info"}>{c.source_type ?? "unknown"}</StatusBadge>
                {c.category ? <StatusBadge tone="neutral">{c.category}</StatusBadge> : null}
                {c.similarity != null ? <span className="font-mono text-[10px] text-muted">sim {c.similarity.toFixed(3)}</span> : null}
              </div>
              <p className="mt-1 text-xs text-ink">{c.title}</p>
              {c.summary ? <p className="mt-1 text-[11px] leading-5 text-muted">{c.summary}</p> : null}
              {isPhysics ? <p className="mt-1 text-[10px] text-amber-200">物理约束·非现场实测</p> : null}
            </li>
          );
        })}
      </ul>
      {retrieved && retrieved.length > citations.length ? (
        <p className="text-[11px] text-muted">另有 {retrieved.length - citations.length} 条检索证据未纳入引用。</p>
      ) : null}
    </div>
  );
}
