"use client";

import { Database, FileText, GitBranch, Layers, Link2, ListChecks, Microscope, Boxes } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useKb } from "@/lib/kb/useKb";
import { kbApi } from "@/lib/kb/apiClient";
import type { KbSummary } from "@/types/kb";

type MetricItem = {
  label: string;
  value: number;
  icon: typeof Database;
  tone: "info" | "success" | "warning" | "neutral";
};

export function KbSummaryCards() {
  const s = useKb<KbSummary>(() => kbApi.summary(), []);

  if (s.state === "loading") return <CockpitSectionPanel title="总览驾驶舱" badge="loading" variant="blueBeam"><p className="text-sm text-muted">正在加载知识库总览…</p></CockpitSectionPanel>;
  if (s.state === "error") return <CockpitSectionPanel title="总览驾驶舱" badge="error" tone="danger" variant="blueBeam"><p className="text-sm text-red-200">{s.message}</p></CockpitSectionPanel>;

  const d = s.data;
  const items: MetricItem[] = [
    { label: "资料文献 source_documents", value: d.sourceDocumentCount, icon: FileText, tone: "info" },
    { label: "文档切片 document_chunks", value: d.documentChunkCount, icon: Layers, tone: "info" },
    { label: "知识卡 knowledge_cards", value: d.knowledgeCardCount, icon: Database, tone: "success" },
    { label: "向量嵌入 embeddings", value: d.embeddingCount, icon: Boxes, tone: "success" },
    { label: "知识关系 relations", value: d.relationCount, icon: GitBranch, tone: "neutral" },
    { label: "规则 rules", value: d.ruleCount, icon: Link2, tone: "neutral" },
    { label: "模板 templates", value: d.templateCount, icon: FileText, tone: "neutral" },
    { label: "审核任务 review_tasks", value: d.reviewTaskCount, icon: ListChecks, tone: "warning" },
  ];

  return (
    <CockpitSectionPanel title="总览驾驶舱" badge="Stage 3" variant="blueBeam">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-[6px] border border-cyan-300/20 bg-[#031020]/72 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{item.value}</p>
              </div>
              <item.icon className="h-5 w-5 shrink-0 text-primary" />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <GroupBlock title="卡片来源类型" counts={d.cardSourceTypeCounts} physicsAware />
        <GroupBlock title="卡片类别" counts={d.cardCategoryCounts} />
        <GroupBlock title="关系类型" counts={d.relationTypeCounts} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[6px] border border-cyan-300/18 bg-cyan-300/[0.05] px-3 py-2">
        <Microscope className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted">embedding 统计：</span>
        <StatusBadge tone={d.embeddingStats.minDims === 384 ? "success" : "warning"}>
          维度 {d.embeddingStats.minDims ?? "?"}-{d.embeddingStats.maxDims ?? "?"}
        </StatusBadge>
        <StatusBadge tone="info">卡片向量 {d.embeddingStats.cardEmbeddings}</StatusBadge>
        <StatusBadge tone="info">切片向量 {d.embeddingStats.chunkEmbeddings}</StatusBadge>
        {d.embeddingStats.nullEmbeddings > 0 ? <StatusBadge tone="danger">空向量 {d.embeddingStats.nullEmbeddings}</StatusBadge> : null}
        {s.warnings.slice(0, 2).map((w) => (
          <span key={w} className="text-[11px] text-amber-200">{w}</span>
        ))}
      </div>
    </CockpitSectionPanel>
  );
}

function GroupBlock({ title, counts, physicsAware }: { title: string; counts: Record<string, number>; physicsAware?: boolean }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-[6px] border border-cyan-300/18 bg-[#031020]/72 p-3">
      <p className="text-xs font-medium text-muted">{title}</p>
      <ul className="mt-2 space-y-1">
        {entries.length === 0 ? <li className="text-xs text-muted">暂无</li> : null}
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink">
              {k}
              {physicsAware && k === "physics_constrained" ? <span className="ml-1 text-amber-200">·物理约束</span> : null}
            </span>
            <span className="font-mono text-primary">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
