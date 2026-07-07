"use client";

import { useState } from "react";
import Link from "next/link";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchNlQuery,
  KnowledgeApiError,
  type KnowledgeNlQueryResult,
} from "@/lib/knowledgeApi";

const MODULE_TITLE = "知识智能 / 煤矿瓦斯灾害知识库";
const PAGE_TITLE = "智能问答";
const PAGE_DESCRIPTION =
  "通过自然语言查询知识库，获取指标、阈值、处置措施、法规依据与相似案例。后端 /api/nl-query 解析意图并返回结构化结果。";

const PLACEHOLDER =
  "例如：瓦斯超限应该怎么处理？红色风险指标有哪些？D 指标超过多少算危险？";

const EXAMPLE_QUERIES = [
  "查询所有红色风险的指标",
  "D01 的管控措施是什么",
  "瓦斯地质的指标有哪些",
  "怎么处理瓦斯超限",
  "总共有多少指标",
];

type AnswerState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: KnowledgeNlQueryResult };

export function KnowledgeAssistantClient() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<AnswerState>({ state: "idle" });

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setAnswer({ state: "error", message: "请输入查询内容。" });
      return;
    }
    setAnswer({ state: "loading" });
    try {
      const result = await fetchNlQuery(trimmed);
      setAnswer({ state: "ok", data: result });
    } catch (err) {
      const message =
        err instanceof KnowledgeApiError ? err.message : err instanceof Error ? err.message : String(err);
      setAnswer({ state: "error", message });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(query);
  };

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
            <StatusBadge tone="info">自然语言查询</StatusBadge>
            <StatusBadge tone="neutral">结构化返回</StatusBadge>
          </div>
        </div>
      </section>

      <ConsoleCard
        title="提问"
        description="支持中文自然语言，后端会识别意图并查询知识库。"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            查询内容
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={3}
              className="console-scrollbar resize-y rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    void submit(example);
                  }}
                  className="rounded-pill border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-primary hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={answer.state === "loading"}
              className="rounded-control border border-primary bg-primary/15 px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/25 disabled:opacity-60"
            >
              {answer.state === "loading" ? "查询中..." : "查询"}
            </button>
          </div>
        </form>
      </ConsoleCard>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <ConsoleCard
          title="查询结果"
          description="结构化展示后端返回的意图、数量与结果列表。"
        >
          <AnswerView answer={answer} />
        </ConsoleCard>

        <ConsoleCard
          title="知识卡片预留区"
          description="后续根据返回结果拆分到下方卡片：相关指标、阈值依据、处置措施、法规来源、相似案例。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ReservedCard title="相关指标" hint="解析结果中的指标列表" />
            <ReservedCard title="阈值依据" hint="指标阈值与红线判定" />
            <ReservedCard title="处置措施" hint="管控措施与处置方法" />
            <ReservedCard title="法规来源" hint="依据的标准与条款" />
            <ReservedCard title="相似案例" hint="事故案例与相似度" />
          </div>
        </ConsoleCard>
      </div>

      <ConsoleCard
        title="边界说明"
        className="mt-5"
      >
        <ul className="space-y-2 text-sm leading-6 text-muted">
          <li>• 查询由后端 <code className="text-primary">/api/nl-query</code> 解析意图，前端不直接访问数据库。</li>
          <li>• 第一阶段以结构化 JSON 展示返回结果，后续补充拆分卡片。</li>
          <li>• 后端不可用时返回 503，前端会提示「知识库服务暂不可用」。</li>
          <li>• 前往 <Link href="/knowledge/overview" className="text-primary underline-offset-2 hover:underline">知识库总览</Link> 或 <Link href="/knowledge/rules" className="text-primary underline-offset-2 hover:underline">规则指标库</Link>。</li>
        </ul>
      </ConsoleCard>
    </div>
  );
}

function AnswerView({ answer }: { answer: AnswerState }) {
  if (answer.state === "idle") {
    return <Hint text="输入问题后点击查询，结果会展示在此。" />;
  }
  if (answer.state === "loading") {
    return <Hint text="正在请求后端解析意图..." />;
  }
  if (answer.state === "error") {
    return <Hint text={answer.message} error />;
  }

  const { data } = answer;
  const results = Array.isArray(data.results) ? data.results : [];
  const counts = data.counts && typeof data.counts === "object" ? data.counts : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {data.intent ? <StatusBadge tone="info">{String(data.intent)}</StatusBadge> : null}
        {typeof data.count === "number" ? (
          <StatusBadge tone="neutral">{data.count} 条结果</StatusBadge>
        ) : null}
        {data.message ? <StatusBadge tone="warning">{String(data.message)}</StatusBadge> : null}
      </div>

      {counts ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(counts).map(([key, value]) => (
            <div key={key} className="rounded-control border border-line bg-surface px-3 py-2">
              <p className="text-xs text-muted">{key}</p>
              <p className="text-lg font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {results.length === 0 ? (
        <Hint text="本次查询未返回结果列表。" />
      ) : (
        <ul className="space-y-2">
          {results.slice(0, 20).map((row, idx) => (
            <li
              key={idx}
              className="rounded-control border border-line bg-surface px-3 py-2 text-sm"
            >
              <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {Object.entries(row).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-muted/80">{k}</dt>
                    <dd className="break-words text-ink">{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
          {results.length > 20 ? (
            <li className="pt-1 text-xs text-muted">仅展示前 20 条，共 {results.length} 条。</li>
          ) : null}
        </ul>
      )}

      <details className="rounded-control border border-line bg-surface px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer text-primary">查看原始返回 JSON</summary>
        <pre className="console-scrollbar mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-muted">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function ReservedCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-control border border-dashed border-line bg-surface/60 px-3 py-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-xs text-muted">{hint}</p>
      <span className="mt-1 text-[11px] uppercase tracking-wider text-muted/70">预留入口</span>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function Hint({ text, error }: { text: string; error?: boolean }) {
  return (
    <p className={`text-sm leading-6 ${error ? "text-red-300" : "text-muted"}`} aria-live="polite">
      {text}
    </p>
  );
}
