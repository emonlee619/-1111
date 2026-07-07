"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchCategories,
  fetchHighRiskIndicators,
  fetchPgStatus,
  fetchRegions,
  fetchStats,
  KnowledgeApiError,
  riskLabel,
  riskTone,
  type KnowledgeIndicator,
  type KnowledgePgStatus,
} from "@/lib/knowledgeApi";

const MODULE_TITLE = "知识智能 / 煤矿瓦斯灾害知识库";
const PAGE_TITLE = "知识库总览";
const PAGE_DESCRIPTION =
  "汇聚风险指标、阈值规则、管控措施、事故案例与法规标准，为瓦斯突出预警解释、溯源研判和处置建议提供知识支撑。";

type LoadState<T> =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: T };

function useKnowledgeResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [status, setStatus] = useState<LoadState<T>>({ state: "loading" });
  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setStatus({ state: "ok", data });
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof KnowledgeApiError ? err.message : err instanceof Error ? err.message : String(err);
        setStatus({ state: "error", message });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return status;
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "neutral" | "info" | "warning" | "danger" }) {
  const toneBorder =
    tone === "danger"
      ? "border-red-400/40"
      : tone === "warning"
        ? "border-orange-300/40"
        : tone === "info"
          ? "border-cyan-300/40"
          : "border-line";
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-card border ${toneBorder} bg-panel-soft p-4 backdrop-blur-xl sm:p-5`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="break-words text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

function ConnectionBadge({ state }: { state: LoadState<KnowledgePgStatus> }) {
  if (state.state === "loading") return <StatusBadge tone="neutral">PostgreSQL 检测中</StatusBadge>;
  if (state.state === "error") return <StatusBadge tone="danger">PostgreSQL 待连接</StatusBadge>;
  return state.data.available ? (
    <StatusBadge tone="success">PostgreSQL 已连接</StatusBadge>
  ) : (
    <StatusBadge tone="warning">PostgreSQL 待连接</StatusBadge>
  );
}

export function KnowledgeOverviewClient() {
  const categories = useKnowledgeResource(fetchCategories);
  const regions = useKnowledgeResource(fetchRegions);
  const highRisk = useKnowledgeResource(fetchHighRiskIndicators);
  const stats = useKnowledgeResource(fetchStats);
  const pgStatus = useKnowledgeResource(fetchPgStatus);

  const neo4jState: LoadState<unknown> = useMemo(() => {
    if (categories.state === "ok" || regions.state === "ok" || stats.state === "ok" || highRisk.state === "ok") {
      return { state: "ok" as const, data: null };
    }
    if (categories.state === "error" && regions.state === "error" && stats.state === "error" && highRisk.state === "error") {
      return { state: "error" as const, message: categories.message };
    }
    return { state: "loading" as const };
  }, [categories, regions, stats, highRisk]);

  const categoryCount = categories.state === "ok" ? categories.data.length : null;
  const highRiskCount = highRisk.state === "ok" ? highRisk.data.length : null;
  const indicatorCount = stats.state === "ok" ? stats.data.total_indicators ?? null : null;

  return (
    <div className="min-w-0">
      <section className="mb-6 overflow-hidden rounded-card border border-line bg-card p-5 shadow-card backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-2 text-sm font-medium text-primary">{MODULE_TITLE}</p>
            <h1 className="break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{PAGE_TITLE}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{PAGE_DESCRIPTION}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">知识库接入</StatusBadge>
            <ConnectionBadge state={pgStatus} />
            {neo4jState.state === "ok" ? (
              <StatusBadge tone="success">Neo4j 已连接</StatusBadge>
            ) : neo4jState.state === "error" ? (
              <StatusBadge tone="danger">Neo4j 待连接</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Neo4j 检测中</StatusBadge>
            )}
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="指标总数"
          value={indicatorCount !== null ? String(indicatorCount) : "—"}
          hint="动态 + 静态指标合计"
          tone="info"
        />
        <MetricCard
          label="知识分类数"
          value={categoryCount !== null ? String(categoryCount) : "—"}
          hint="Neo4j Category 节点"
        />
        <MetricCard
          label="高风险指标"
          value={highRiskCount !== null ? String(highRiskCount) : "—"}
          hint="触发红/重大风险等级"
          tone="danger"
        />
        <MetricCard
          label="管控区域"
          value={regions.state === "ok" ? String(regions.data.length) : "—"}
          hint="Neo4j Region 节点"
        />
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <ConsoleCard
          title="知识分类"
          description="按瓦斯地质、应力地压、采掘扰动、通风抽采等专业域组织指标与规则。"
        >
          {categories.state === "loading" ? (
            <EmptyHint text="正在加载分类列表..." />
          ) : categories.state === "error" ? (
            <EmptyHint text={categories.message} error />
          ) : categories.data.length === 0 ? (
            <EmptyHint text="当前 Neo4j 中暂无 Category 节点。" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {categories.data.map((name) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink"
                >
                  <span className="truncate">{name}</span>
                  <span className="text-xs text-muted">分类</span>
                </li>
              ))}
            </ul>
          )}
        </ConsoleCard>

        <ConsoleCard
          title="高风险指标清单"
          description="触发红/重大风险等级的指标，需重点监管与处置。"
        >
          {highRisk.state === "loading" ? (
            <EmptyHint text="正在加载高风险指标..." />
          ) : highRisk.state === "error" ? (
            <EmptyHint text={highRisk.message} error />
          ) : highRisk.data.length === 0 ? (
            <EmptyHint text="当前暂无红色风险指标。" />
          ) : (
            <ul className="space-y-2">
              {highRisk.data.slice(0, 12).map((item) => (
                <HighRiskRow key={item.id} indicator={item} />
              ))}
              {highRisk.data.length > 12 ? (
                <li className="pt-1 text-xs text-muted">仅展示前 12 条，共 {highRisk.data.length} 条。</li>
              ) : null}
            </ul>
          )}
        </ConsoleCard>
      </div>

      <ConsoleCard
        title="知识库统计"
        description="覆盖指标、规则、措施、案例、标准条款与版本记录的总量。"
        className="mt-5"
      >
        {stats.state === "loading" ? (
          <EmptyHint text="正在加载统计..." />
        ) : stats.state === "error" ? (
          <EmptyHint text={stats.message} error />
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatItem label="动态指标" value={stats.data.dynamic_indicators} />
            <StatItem label="静态指标" value={stats.data.static_indicators} />
            <StatItem label="风险规则" value={stats.data.total_rules} />
            <StatItem label="管控措施" value={stats.data.total_measures} />
            <StatItem label="事故案例" value={stats.data.total_cases} />
            <StatItem label="法规标准" value={stats.data.total_standards} />
            <StatItem label="标准条款" value={stats.data.total_clauses} />
            <StatItem label="版本记录" value={stats.data.total_version_records} />
          </div>
        )}
      </ConsoleCard>

      <ConsoleCard
        title="连接与边界说明"
        description="前端通过 Next.js API 代理访问 FastAPI 后端，不直连 Neo4j / PostgreSQL。"
        className="mt-5"
      >
        <ul className="space-y-2 text-sm leading-6 text-muted">
          <li>• 数据来源：FastAPI 后端由 Next.js API 代理转发，浏览器不直连后端服务地址。</li>
          <li>• 后端不可用时接口返回 503，页面会标注「待连接」。</li>
          <li>• 知识图谱可视化、PostgreSQL 静态评价页为本阶段预留入口，暂未实现。</li>
          <li>• 可前往 <Link href="/knowledge/rules" className="text-primary underline-offset-2 hover:underline">规则指标库</Link>、<Link href="/knowledge/assistant" className="text-primary underline-offset-2 hover:underline">智能问答</Link>查看更多。</li>
        </ul>
      </ConsoleCard>
    </div>
  );
}

function HighRiskRow({ indicator }: { indicator: KnowledgeIndicator }) {
  return (
    <li className="flex flex-col gap-2 rounded-control border border-red-400/30 bg-red-500/[0.06] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-pill bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-200">
            {indicator.id}
          </span>
          <span className="truncate text-sm font-medium text-ink">{indicator.name}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {indicator.category || "未分类"}
          {indicator.threshold ? ` · 阈值：${indicator.threshold}` : ""}
        </p>
      </div>
      <StatusBadge tone={riskTone(indicator.risk_level)}>{riskLabel(indicator.risk_level)}</StatusBadge>
    </li>
  );
}

function StatItem({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value ?? 0}</p>
    </div>
  );
}

function EmptyHint({ text, error }: { text: string; error?: boolean }) {
  return (
    <p className={`text-sm leading-6 ${error ? "text-red-300" : "text-muted"}`} aria-live="polite">
      {text}
    </p>
  );
}
