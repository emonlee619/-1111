"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchCategories,
  fetchIndicators,
  fetchMeasures,
  fetchRules,
  KnowledgeApiError,
  riskLabel,
  riskTone,
  type IndicatorFilter,
  type KnowledgeIndicator,
  type KnowledgeMeasure,
  type KnowledgeRule,
} from "@/lib/knowledgeApi";

const MODULE_TITLE = "知识智能 / 煤矿瓦斯灾害知识库";
const PAGE_TITLE = "规则指标库";
const PAGE_DESCRIPTION =
  "按动态/静态指标、专业分类与关键词检索风险指标，关联阈值规则与管控措施，为处置建议提供依据。";

type IndicatorListState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: KnowledgeIndicator[] };

export function KnowledgeRulesClient() {
  const [keyword, setKeyword] = useState("");
  const [indicatorType, setIndicatorType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [indicatorState, setIndicatorState] = useState<IndicatorListState>({ state: "loading" });
  const [indicatorFilterKey, setIndicatorFilterKey] = useState<string>("");
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  const [rules, setRules] = useState<KnowledgeRule[]>([]);
  const [rulesState, setRulesState] = useState<"loading" | "error" | "ok">("loading");
  const [measures, setMeasures] = useState<KnowledgeMeasure[]>([]);
  const [measuresState, setMeasuresState] = useState<"loading" | "error" | "ok">("loading");

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((data) => {
        if (active) {
          setCategoryList(data);
          setCategoryLoading(false);
        }
      })
      .catch(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadIndicators = useCallback(() => {
    let active = true;
    const filter: IndicatorFilter = {
      keyword: keyword.trim() || undefined,
      indicator_type: indicatorType || undefined,
      category: category || undefined,
    };
    fetchIndicators(filter)
      .then((data) => {
        if (active) {
          setIndicatorState({ state: "ok", data });
          setIndicatorFilterKey(JSON.stringify(filter));
        }
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof KnowledgeApiError ? err.message : err instanceof Error ? err.message : String(err);
        setIndicatorState({ state: "error", message });
      });
    return () => {
      active = false;
    };
  }, [keyword, indicatorType, category]);

  useEffect(() => {
    const cleanup = loadIndicators();
    return cleanup;
  }, [loadIndicators]);

  useEffect(() => {
    let active = true;
    fetchRules()
      .then((data) => {
        if (active) {
          setRules(data);
          setRulesState("ok");
        }
      })
      .catch(() => {
        if (active) setRulesState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchMeasures()
      .then((data) => {
        if (active) {
          setMeasures(data);
          setMeasuresState("ok");
        }
      })
      .catch(() => {
        if (active) setMeasuresState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const currentFilterKey = useMemo(
    () =>
      JSON.stringify({
        keyword: keyword.trim() || undefined,
        indicator_type: indicatorType || undefined,
        category: category || undefined,
      }),
    [keyword, indicatorType, category],
  );

  const displayIndicatorState: IndicatorListState =
    indicatorState.state === "ok" && indicatorFilterKey !== currentFilterKey
      ? { state: "loading" }
      : indicatorState;

  const indicators = indicatorState.state === "ok" ? indicatorState.data : [];
  const filteredMeasures = useMemo(() => measures.slice(0, 12), [measures]);

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
            <StatusBadge tone="info">指标 · 规则 · 措施</StatusBadge>
            <StatusBadge tone="neutral">{indicators.length} 条指标</StatusBadge>
          </div>
        </div>
      </section>

      <ConsoleCard
        title="检索与筛选"
        description="支持关键词、动态/静态属性与专业分类组合筛选。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            关键词
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="指标编号、名称"
              className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            指标属性
            <select
              value={indicatorType}
              onChange={(e) => setIndicatorType(e.target.value)}
              className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="">全部</option>
              <option value="动态">动态指标</option>
              <option value="静态">静态指标</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            专业分类
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={categoryLoading}
              className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">{categoryLoading ? "加载分类中..." : "全部分类"}</option>
              {categoryList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setIndicatorType("");
                setCategory("");
              }}
              className="rounded-control border border-line bg-surface px-4 py-2 text-sm text-muted transition hover:border-primary hover:text-ink"
            >
              重置筛选
            </button>
          </div>
        </div>
      </ConsoleCard>

      <ConsoleCard
        title="指标卡片"
        description="展示指标编号、名称、阈值、分类、风险等级与属性，点击可预留跳转知识图谱详情。"
        className="mt-5"
      >
        {displayIndicatorState.state === "loading" ? (
          <Hint text="正在加载指标..." />
        ) : displayIndicatorState.state === "error" ? (
          <Hint text={displayIndicatorState.message} error />
        ) : indicators.length === 0 ? (
          <Hint text="当前筛选条件下暂无指标。" />
        ) : (
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {indicators.map((item) => (
              <IndicatorCard key={item.id} indicator={item} />
            ))}
          </div>
        )}
      </ConsoleCard>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <ConsoleCard
          title="风险规则"
          description="规则与危险源、建议风险等级的映射关系，预留规则详情入口。"
        >
          {rulesState === "loading" ? (
            <Hint text="加载规则中..." />
          ) : rulesState === "error" ? (
            <Hint text="规则加载失败，请确认后端 /api/rules 可用。" error />
          ) : rules.length === 0 ? (
            <Hint text="暂无规则数据。" />
          ) : (
            <ul className="space-y-2">
              {rules.slice(0, 12).map((rule, idx) => (
                <li
                  key={rule.rule_id ?? rule.id ?? idx}
                  className="rounded-control border border-line bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink">{rule.hazard_name ?? rule.id ?? "—"}</span>
                    <StatusBadge tone={riskTone(rule.suggested_risk_level)}>
                      {riskLabel(rule.suggested_risk_level)}
                    </StatusBadge>
                  </div>
                  {(rule.attribute ?? rule.hazard_id) && (
                    <p className="mt-1 text-xs text-muted">
                      {rule.hazard_id ? `编号 ${rule.hazard_id}` : ""}
                      {rule.attribute ? ` · ${rule.attribute}` : ""}
                    </p>
                  )}
                </li>
              ))}
              {rules.length > 12 ? (
                <li className="pt-1 text-xs text-muted">仅展示前 12 条，共 {rules.length} 条。</li>
              ) : null}
            </ul>
          )}
        </ConsoleCard>

        <ConsoleCard
          title="管控措施"
          description="按指标关联的处置措施与依据，预留措施详情入口。"
        >
          {measuresState === "loading" ? (
            <Hint text="加载措施中..." />
          ) : measuresState === "error" ? (
            <Hint text="措施加载失败，请确认后端 /api/measures 可用。" error />
          ) : measures.length === 0 ? (
            <Hint text="暂无措施数据。" />
          ) : (
            <ul className="space-y-2">
              {filteredMeasures.map((measure) => (
                <li
                  key={measure.id}
                  className="rounded-control border border-line bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-pill bg-cyan-400/15 px-2 py-0.5 text-xs text-primary">
                      {measure.id}
                    </span>
                    <span className="text-muted text-xs">{measure.source || "措施库"}</span>
                  </div>
                  <p className="mt-1 leading-6 text-ink">{measure.content}</p>
                </li>
              ))}
              {measures.length > 12 ? (
                <li className="pt-1 text-xs text-muted">仅展示前 12 条，共 {measures.length} 条。</li>
              ) : null}
            </ul>
          )}
        </ConsoleCard>
      </div>

      <ConsoleCard
        title="边界说明"
        className="mt-5"
      >
        <ul className="space-y-2 text-sm leading-6 text-muted">
          <li>• 指标数据来源于 Neo4j，由 FastAPI 提供，前端不直连数据库。</li>
          <li>• 指标卡片点击跳转知识图谱详情为本阶段预留入口，暂未实现可视化。</li>
          <li>• 前往 <Link href="/knowledge/overview" className="text-primary underline-offset-2 hover:underline">知识库总览</Link> 或 <Link href="/knowledge/assistant" className="text-primary underline-offset-2 hover:underline">智能问答</Link>。</li>
        </ul>
      </ConsoleCard>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: KnowledgeIndicator }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-panel-soft p-4 backdrop-blur-xl transition hover:border-primary/60 hover:shadow-glow">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-pill bg-cyan-400/15 px-2 py-0.5 text-xs font-medium text-primary">
              {indicator.id}
            </span>
            {indicator.type ? (
              <span className="rounded-pill border border-line px-2 py-0.5 text-xs text-muted">
                {indicator.type}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 break-words text-base font-semibold text-ink">{indicator.name}</h3>
        </div>
        <StatusBadge tone={riskTone(indicator.risk_level)}>{riskLabel(indicator.risk_level)}</StatusBadge>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
        <Field label="分类" value={indicator.category || "未分类"} />
        <Field label="阈值" value={indicator.threshold || "—"} />
        {indicator.symbol ? <Field label="符号" value={indicator.symbol} /> : null}
        {indicator.region ? <Field label="区域" value={indicator.region} /> : null}
      </dl>
      {indicator.description ? (
        <p className="line-clamp-2 text-xs leading-5 text-muted">{indicator.description}</p>
      ) : null}
      <div className="flex items-center justify-between border-t border-line/60 pt-2 text-xs text-muted">
        <span>知识图谱详情</span>
        <span className="text-primary/60">预留入口</span>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted/80">{label}</dt>
      <dd className="break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

function Hint({ text, error }: { text: string; error?: boolean }) {
  return (
    <p className={`text-sm leading-6 ${error ? "text-red-300" : "text-muted"}`} aria-live="polite">
      {text}
    </p>
  );
}
