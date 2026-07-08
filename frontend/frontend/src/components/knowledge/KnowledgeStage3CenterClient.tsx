"use client";

import { BookOpenCheck } from "lucide-react";
import { CockpitAmbientLayer } from "@/components/cockpit/CockpitAmbientLayer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useKb } from "@/lib/kb/useKb";
import { kbApi } from "@/lib/kb/apiClient";
import type { KbSummary, KbCoverage, KbApiMode } from "@/types/kb";
import { KbModeBanner } from "./KbModeBanner";
import { KbSummaryCards } from "./KbSummaryCards";
import { KbCoveragePanel } from "./KbCoveragePanel";
import { ChannelCoverageMatrix } from "./ChannelCoverageMatrix";
import { KbSemanticSearchPanel } from "./KbSemanticSearchPanel";
import { KbAskPanel } from "./KbAskPanel";
import { KbRelationPanel } from "./KbRelationPanel";
import { KbReviewTaskPanel } from "./KbReviewTaskPanel";
import { KbSystemStatusPanel } from "./KbSystemStatusPanel";

/**
 * Stage 3 知识中枢容器。
 * 只负责布局与顶层模式分发，数据请求封装在 lib/kb。
 * 8 个区块：总览 / 资料覆盖 / 63维矩阵 / 语义检索 / RAG问答 / 关系图谱 / 审核任务 / 系统状态。
 */
export function KnowledgeStage3CenterClient() {
  const summary = useKb<KbSummary>(() => kbApi.summary(), []);
  const coverage = useKb<KbCoverage | null>(async () => {
    const env = await kbApi.coverage();
    return { data: env.data, mode: env.mode, warnings: env.warnings };
  }, []);

  let mode: KbApiMode = "online";
  let embeddingDims: number | null = null;
  let lastUpdatedAt: string | null = null;
  let summaryWarnings: string[] = [];

  if (summary.state === "ok") {
    mode = summary.mode;
    embeddingDims = summary.data.embeddingStats.minDims;
    lastUpdatedAt = summary.data.lastUpdatedAt;
    summaryWarnings = summary.warnings;
  } else if (summary.state === "error") {
    mode = "offline";
    summaryWarnings = [summary.message];
  }

  const semanticAvailable = mode === "online" && embeddingDims === 384;
  const cov = coverage.state === "ok" ? coverage.data : null;
  const covLoading = coverage.state === "loading";
  const covError = coverage.state === "error" ? coverage.message : null;

  return (
    <section className="relative isolate min-h-[calc(100vh-112px)] overflow-hidden">
      <CockpitAmbientLayer variant="featured" />
      <div className="relative z-10 space-y-3">
        <header className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/82 px-4 py-4 shadow-card backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpenCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Supabase 知识中枢 · Stage 3</span>
            <StatusBadge tone="info">63 通道</StatusBadge>
            <StatusBadge tone="warning">人工复核边界</StatusBadge>
            <StatusBadge tone="info">384 维 TF-IDF+SVD</StatusBadge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">企业级知识库与 AI 证据中枢</h1>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-muted">
            统一通过 <code className="text-primary">/api/kb/*</code> 服务端读取 Supabase。R01-R22 为真实传感器；B01-B41 为物理约束生成/估计，不是现场实测，不得单独触发断电、撤人、执法或重大隐患判定。
          </p>
        </header>

        <KbModeBanner
          mode={mode}
          semanticAvailable={semanticAvailable}
          embeddingDims={embeddingDims}
          lastUpdatedAt={lastUpdatedAt}
          warningCount={summaryWarnings.length}
        />

        {/* 区块1 总览驾驶舱 */}
        <KbSummaryCards />

        {/* 区块2 资料覆盖 + 区块3 63维矩阵 */}
        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <KbCoveragePanel coverage={cov} loading={covLoading} error={covError} />
          <ChannelCoverageMatrix coverage={cov} loading={covLoading} error={covError} />
        </div>

        {/* 区块4 语义检索 + 区块5 RAG问答 */}
        <div className="grid gap-3 xl:grid-cols-2">
          <KbSemanticSearchPanel />
          <KbAskPanel />
        </div>

        {/* 区块6 关系图谱 + 区块7 审核任务 */}
        <div className="grid gap-3 xl:grid-cols-2">
          <KbRelationPanel />
          <KbReviewTaskPanel />
        </div>

        {/* 区块8 系统状态 */}
        <KbSystemStatusPanel
          mode={mode}
          semanticAvailable={semanticAvailable}
          embeddingDims={embeddingDims}
          lastUpdatedAt={lastUpdatedAt}
          warnings={summaryWarnings}
        />
      </div>
    </section>
  );
}
