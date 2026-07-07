"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Database,
  FileSearch,
  GitBranch,
  LibraryBig,
  MessageSquareText,
  Network,
  ShieldCheck,
} from "lucide-react";
import { CockpitAmbientLayer } from "@/components/cockpit/CockpitAmbientLayer";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockAgent } from "@/data/mockAgent";
import { mockKnowledge } from "@/data/mockKnowledge";
import {
  fetchCategories,
  fetchAiAnswer,
  fetchHighRiskIndicators,
  fetchIndicators,
  fetchMeasures,
  fetchPgStatus,
  fetchRegions,
  fetchRules,
  fetchStats,
  KnowledgeApiError,
  riskLabel,
  type KnowledgeAiAnswer,
  type IndicatorFilter,
  type KnowledgeIndicator,
  type KnowledgeMeasure,
  type KnowledgePgStatus,
  type KnowledgeRule,
  type KnowledgeStats,
} from "@/lib/knowledgeApi";
import { cn } from "@/lib/cn";

export type KnowledgeView =
  | "entry"
  | "overview"
  | "rules"
  | "search"
  | "causal"
  | "assistant"
  | "culture"
  | "agent";

type LoadState<T> =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: T };

type ViewCopy = {
  title: string;
  subtitle: string;
  badge: string;
  mode: "mock" | "api" | "hybrid";
};

const tabs = [
  { title: "总览", href: "/knowledge", view: "entry" },
  { title: "知识库总览", href: "/knowledge/overview", view: "overview" },
  { title: "规则知识库", href: "/knowledge/rules", view: "rules" },
  { title: "标准检索", href: "/knowledge/search", view: "search" },
  { title: "致灾图谱", href: "/knowledge/causal-graph", view: "causal" },
  { title: "智能问答", href: "/knowledge/assistant", view: "assistant" },
] satisfies Array<{ title: string; href: string; view: KnowledgeView }>;

const viewCopy: Record<KnowledgeView, ViewCopy> = {
  entry: {
    title: "知识智能总览",
    subtitle: "统一承载标准规范、规则指标、致灾图谱、知识文化与智能问答入口，所有结论保持辅助解释边界。",
    badge: "知识 mock 总览",
    mode: "mock",
  },
  overview: {
    title: "知识库总览",
    subtitle: "查看 Neo4j 分类、管控区域、高风险指标与知识库统计；后端不可用时保持 503 待连接状态。",
    badge: "FastAPI 接入",
    mode: "api",
  },
  rules: {
    title: "规则知识库",
    subtitle: "按关键词、指标属性和专业分类检索风险指标，并并列查看风险规则与管控措施。",
    badge: "指标 · 规则 · 措施",
    mode: "api",
  },
  search: {
    title: "标准规范检索",
    subtitle: "面向制度条款和标准摘要的检索入口，仅展示 mock 摘要，不联网抓取或展示未经授权全文。",
    badge: "mock 标准库",
    mode: "mock",
  },
  causal: {
    title: "致灾路径图谱",
    subtitle: "以节点、关系边和证据卡片表达瓦斯灾害因果链路，图谱关系只作辅助研判。",
    badge: "mock 因果图谱",
    mode: "mock",
  },
  assistant: {
    title: "智能问答",
    subtitle: "通过自然语言查询知识库，展示结构化返回、引用提示和人工复核边界。",
    badge: "自然语言查询",
    mode: "api",
  },
  culture: {
    title: "知识文化展板",
    subtitle: "展示制度知识、培训材料和案例摘要，与双重预防文化展板保持业务边界。",
    badge: "mock 文化展板",
    mode: "mock",
  },
  agent: {
    title: "AI 问答入口",
    subtitle: "保留通用 AI 问答占位和安全提示，不接真实大模型，不输出强制处置命令。",
    badge: "mock AI 入口",
    mode: "mock",
  },
};

const exampleQueries = [
  "查询所有红色风险的指标",
  "瓦斯超限应该怎么处理",
  "D01 的管控措施是什么",
  "D01 依据什么标准",
  "总共有多少指标",
];

export function KnowledgeWorkspace({ view }: { view: KnowledgeView }) {
  const copy = viewCopy[view];

  return (
    <section className="relative isolate min-h-[calc(100vh-112px)] overflow-hidden">
      <CockpitAmbientLayer variant="featured" />
      <div className="relative z-10 space-y-3">
        <KnowledgeHeader view={view} copy={copy} />
        <KnowledgeMetrics view={view} />
        <KnowledgeBody view={view} />
        <BoundaryStrip view={view} />
      </div>
    </section>
  );
}

function KnowledgeHeader({ view, copy }: { view: KnowledgeView; copy: ViewCopy }) {
  return (
    <header className="cockpit-chamfer-sm relative overflow-hidden rounded-[7px] border border-cyan-300/24 bg-[#061a31]/82 px-4 py-4 shadow-[inset_0_0_28px_rgba(34,211,238,0.07),0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-cyan-200/70 shadow-[0_0_16px_rgba(34,211,238,0.7)]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary">知识智能 / 煤矿瓦斯灾害知识库</span>
            <StatusBadge tone={copy.mode === "api" ? "info" : copy.mode === "hybrid" ? "warning" : "neutral"}>
              {copy.badge}
            </StatusBadge>
          </div>
          <h1 className="break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge tone="info">知识图谱</StatusBadge>
          <StatusBadge tone="neutral">标准检索</StatusBadge>
          <StatusBadge tone="warning">人工复核</StatusBadge>
        </div>
      </div>
      <nav aria-label="知识智能二级入口" className="console-scrollbar mt-4 flex min-w-0 gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.view === view ? "page" : undefined}
            className={cn(
              "cockpit-chamfer-sm shrink-0 rounded-[4px] border px-4 py-2 text-sm font-medium transition",
              tab.view === view
                ? "border-cyan-200/70 bg-cyan-300/18 text-ink shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                : "border-cyan-300/20 bg-cyan-300/[0.055] text-muted hover:border-cyan-200/50 hover:text-ink",
            )}
          >
            {tab.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function KnowledgeMetrics({ view }: { view: KnowledgeView }) {
  const overview = useKnowledgeOverview(view === "overview");
  const rules = useKnowledgeRules(view === "rules");
  const metrics = useMemo(() => {
    if (view === "overview") {
      return [
        { label: "指标总数", value: valueOrDash(overview.stats, (data) => data.total_indicators), hint: "动态 + 静态指标合计", icon: Database },
        { label: "知识分类", value: valueOrDash(overview.categories, (data) => data.length), hint: "Neo4j Category 节点", icon: LibraryBig },
        { label: "高风险指标", value: valueOrDash(overview.highRisk, (data) => data.length), hint: "红色/重大风险", icon: ShieldCheck, danger: true },
        { label: "管控区域", value: valueOrDash(overview.regions, (data) => data.length), hint: "Neo4j Region 节点", icon: Network },
      ];
    }

    if (view === "rules") {
      return [
        { label: "筛选指标", value: rules.indicators.state === "ok" ? String(rules.indicators.data.length) : "-", hint: "当前条件返回", icon: Database },
        { label: "风险规则", value: rules.rules.state === "ok" ? String(rules.rules.data.length) : "-", hint: "/api/rules", icon: ShieldCheck },
        { label: "管控措施", value: rules.measures.state === "ok" ? String(rules.measures.data.length) : "-", hint: "/api/measures", icon: BookOpen },
        { label: "筛选维度", value: "3", hint: "关键词/属性/分类", icon: FileSearch },
      ];
    }

    if (view === "assistant") {
      return [
        { label: "示例问题", value: String(exampleQueries.length), hint: "快捷查询", icon: MessageSquareText },
        { label: "后端接口", value: "/ai-answer", hint: "检索增强问答", icon: Bot },
        { label: "引用证据", value: "Neo4j", hint: "指标/措施/案例", icon: Database },
        { label: "安全边界", value: "人工复核", hint: "不替代制度解释", icon: ShieldCheck },
      ];
    }

    if (view === "causal") {
      return [
        { label: "因素节点", value: "6", hint: "瓦斯/通风/地质等", icon: Network },
        { label: "关系边", value: "22", hint: "mock 因果关系", icon: GitBranch },
        { label: "关联证据", value: String(mockAgent.citations.length), hint: "标准摘要", icon: BookOpen },
        { label: "结论边界", value: "辅助", hint: "非事故认定", icon: ShieldCheck },
      ];
    }

    if (view === "search") {
      return [
        { label: "规范条目", value: String(mockKnowledge.standards.length), hint: "mock 标准摘要", icon: FileSearch },
        { label: "分类", value: "3", hint: "通风/防突/双控", icon: LibraryBig },
        { label: "适用场景", value: "3", hint: "业务标签", icon: BookOpen },
        { label: "全文边界", value: "摘要", hint: "不展示授权外全文", icon: ShieldCheck },
      ];
    }

    return [
      { label: "标准规范", value: String(mockKnowledge.standards.length), hint: "检索入口", icon: BookOpen },
      { label: "推荐问题", value: String(mockAgent.recommendedQuestions.length), hint: "AI 问答引导", icon: MessageSquareText },
      { label: "致灾图谱", value: "22", hint: "mock 关系边", icon: GitBranch },
      { label: "引用证据", value: String(mockAgent.citations.length), hint: "回答必须引用", icon: ShieldCheck },
    ];
  }, [overview, rules, view]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => (
        <article
          key={item.label}
          className={cn(
            "cockpit-chamfer-sm relative min-w-0 overflow-hidden rounded-[7px] border bg-[#061a31]/78 p-4 shadow-[inset_0_0_22px_rgba(34,211,238,0.055),0_14px_30px_rgba(0,0,0,0.2)]",
            item.danger ? "border-red-300/35" : "border-cyan-300/24",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted">{item.label}</p>
              <p className="mt-2 break-words text-2xl font-semibold text-ink">{item.value}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{item.hint}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-primary">
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function KnowledgeBody({ view }: { view: KnowledgeView }) {
  if (view === "overview") return <OverviewPanels />;
  if (view === "rules") return <RulesPanels />;
  if (view === "search") return <SearchPanels />;
  if (view === "causal") return <CausalPanels />;
  if (view === "assistant") return <AssistantPanels />;
  if (view === "culture") return <CulturePanels />;
  if (view === "agent") return <AgentPanels />;
  return <EntryPanels />;
}

function EntryPanels() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.35fr_1fr]">
      <CockpitSectionPanel title="标准库分类" badge="规范" variant="blueBeam">
        <KnowledgeList
          items={mockKnowledge.standards.map((item) => ({
            title: item.title,
            meta: `${item.category} / ${item.scenario}`,
            desc: item.summary,
            badge: item.id,
          }))}
        />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="知识检索 + 致灾图谱 + AI 问答" badge="知识模式" variant="blueBeam">
        <div className="grid gap-3 md:grid-cols-2">
          <QuickEntry href="/knowledge/search" icon={FileSearch} title="标准检索" desc="按标准、场景和摘要检索制度依据。" />
          <QuickEntry href="/knowledge/causal-graph" icon={GitBranch} title="致灾图谱" desc="查看瓦斯灾害因素节点和关系边。" />
          <QuickEntry href="/knowledge/rules" icon={Database} title="规则知识库" desc="检索指标阈值、风险规则和管控措施。" />
          <QuickEntry href="/knowledge/assistant" icon={Bot} title="智能问答" desc="用自然语言查询知识库并保留引用证据。" />
        </div>
      </CockpitSectionPanel>
      <CockpitSectionPanel title="推荐问题 Top4" badge="问答" variant="blueBeam">
        <KnowledgeList items={mockAgent.recommendedQuestions.map((title, index) => ({ title, meta: `Q${index + 1}`, badge: "mock" }))} />
      </CockpitSectionPanel>
    </div>
  );
}

function OverviewPanels() {
  const data = useKnowledgeOverview(true);
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <CockpitSectionPanel title="知识分类" badge={stateBadge(data.categories)} variant="blueBeam">
        <StateList state={data.categories} render={(rows) => rows.map((name) => ({ title: name, meta: "Neo4j Category 节点", badge: "分类" }))} />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="高风险指标清单" badge={stateBadge(data.highRisk)} tone="danger" variant="blueBeam">
        <StateList
          state={data.highRisk}
          render={(rows) =>
            rows.slice(0, 10).map((item) => ({
              title: item.name,
              meta: `${item.category ?? "未分类"}${item.threshold ? ` / 阈值 ${item.threshold}` : ""}`,
              badge: riskLabel(item.risk_level),
              danger: true,
            }))
          }
        />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="知识库统计" badge={stateBadge(data.stats)} variant="blueBeam" className="xl:col-span-2">
        {data.stats.state === "ok" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="动态指标" value={data.stats.data.dynamic_indicators} />
            <StatTile label="静态指标" value={data.stats.data.static_indicators} />
            <StatTile label="风险规则" value={data.stats.data.total_rules} />
            <StatTile label="管控措施" value={data.stats.data.total_measures} />
            <StatTile label="事故案例" value={data.stats.data.total_cases} />
            <StatTile label="法规标准" value={data.stats.data.total_standards} />
            <StatTile label="标准条款" value={data.stats.data.total_clauses} />
            <StatTile label="版本记录" value={data.stats.data.total_version_records} />
          </div>
        ) : (
          <Hint state={data.stats} />
        )}
      </CockpitSectionPanel>
    </div>
  );
}

function RulesPanels() {
  const data = useKnowledgeRules(true);
  return (
    <div className="space-y-3">
      <CockpitSectionPanel title="检索与筛选" badge="3 项筛选" variant="blueBeam">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="关键词">
            <input
              value={data.keyword}
              onChange={(event) => data.setKeyword(event.target.value)}
              placeholder="指标编号、名称"
              className="h-10 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none focus:border-cyan-200/70"
            />
          </Field>
          <Field label="指标属性">
            <select
              value={data.indicatorType}
              onChange={(event) => data.setIndicatorType(event.target.value)}
              className="h-10 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none focus:border-cyan-200/70"
            >
              <option value="">全部</option>
              <option value="动态">动态指标</option>
              <option value="静态">静态指标</option>
            </select>
          </Field>
          <Field label="专业分类">
            <select
              value={data.category}
              onChange={(event) => data.setCategory(event.target.value)}
              className="h-10 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none focus:border-cyan-200/70"
            >
              <option value="">全部分类</option>
              {data.categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={data.reset}
              className="h-10 rounded-[4px] border border-cyan-300/24 bg-cyan-300/[0.08] px-4 text-sm text-muted transition hover:border-cyan-200/60 hover:text-ink"
            >
              重置筛选
            </button>
          </div>
        </div>
      </CockpitSectionPanel>
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <CockpitSectionPanel title="指标卡片" badge={stateBadge(data.indicators)} variant="blueBeam">
          <StateList
            state={data.indicators}
            render={(rows) =>
              rows.slice(0, 12).map((item) => ({
                title: item.name,
                meta: `${item.id} / ${item.category ?? "未分类"} / ${item.threshold ?? "阈值待补充"}`,
                badge: riskLabel(item.risk_level),
              }))
            }
          />
        </CockpitSectionPanel>
        <CockpitSectionPanel title="风险规则" badge={stateBadge(data.rules)} variant="blueBeam">
          <StateList
            state={data.rules}
            render={(rows) =>
              rows.slice(0, 8).map((item, index) => ({
                title: item.hazard_name ?? item.rule_id ?? item.id ?? `规则 ${index + 1}`,
                meta: item.attribute ?? item.hazard_id ?? "风险规则",
                badge: riskLabel(item.suggested_risk_level),
              }))
            }
          />
        </CockpitSectionPanel>
        <CockpitSectionPanel title="管控措施" badge={stateBadge(data.measures)} variant="blueBeam" className="xl:col-span-2">
          <StateList
            state={data.measures}
            render={(rows) =>
              rows.slice(0, 8).map((item) => ({
                title: item.content,
                meta: item.source ?? "措施库",
                badge: item.id,
              }))
            }
          />
        </CockpitSectionPanel>
      </div>
    </div>
  );
}

function SearchPanels() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
      <CockpitSectionPanel title="标准规范检索结果" badge="摘要" variant="blueBeam">
        <KnowledgeList
          items={mockKnowledge.standards.map((item) => ({
            title: item.title,
            meta: `${item.category} / ${item.scenario}`,
            desc: item.summary,
            badge: item.id,
          }))}
        />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="检索边界" badge="只读" variant="blueBeam">
        <KnowledgeList
          items={[
            { title: "仅使用 mock 规范条目", meta: "不接真实文档库" },
            { title: "不联网检索", meta: "避免把外部文本混入制度库" },
            { title: "不展示未经授权全文", meta: "页面只呈现摘要和适用场景" },
          ]}
        />
      </CockpitSectionPanel>
    </div>
  );
}

function CausalPanels() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr_1fr]">
      <CockpitSectionPanel title="图谱节点" badge="节点" variant="blueBeam">
        <KnowledgeList items={mockKnowledge.causalGraph.map((item) => ({ title: item.label, meta: item.value, badge: "图谱" }))} />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="致灾链路示意" badge="22 条 mock 因果关系" variant="blueBeam">
        <div className="relative min-h-64 overflow-hidden rounded-[6px] border border-cyan-300/18 bg-[#041526]/72">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[length:42px_42px]" />
          {["瓦斯异常", "通风不足", "地质构造", "采掘扰动", "应力集中", "处置措施"].map((label, index) => (
            <div
              key={label}
              className="absolute grid h-16 w-16 place-items-center rounded-full border border-cyan-200/45 bg-cyan-300/14 text-center text-xs font-medium text-ink shadow-[0_0_22px_rgba(34,211,238,0.18)]"
              style={{
                left: `${index % 3 === 0 ? 12 : index % 3 === 1 ? 42 : 70}%`,
                top: `${index < 3 ? 22 + index * 10 : 58 - (index - 3) * 8}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {label}
            </div>
          ))}
          <div className="absolute left-[20%] top-[45%] h-px w-[58%] rotate-6 bg-cyan-200/35" />
          <div className="absolute left-[32%] top-[30%] h-px w-[34%] -rotate-12 bg-yellow-200/35" />
          <div className="absolute left-[38%] top-[61%] h-px w-[36%] rotate-12 bg-red-200/30" />
        </div>
      </CockpitSectionPanel>
      <CockpitSectionPanel title="关联标准与证据" badge="引用" variant="blueBeam">
        <KnowledgeList items={mockAgent.citations.map((item) => ({ title: item.title, meta: `${item.category} / ${item.scenario}`, desc: item.summary, badge: item.id }))} />
      </CockpitSectionPanel>
    </div>
  );
}

function AssistantPanels() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<LoadState<KnowledgeAiAnswer> | { state: "idle" }>({ state: "idle" });

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setAnswer({ state: "error", message: "请输入查询内容。" });
      return;
    }
    setAnswer({ state: "loading" });
    try {
      setAnswer({ state: "ok", data: await fetchAiAnswer(trimmed) });
    } catch (error) {
      setAnswer({ state: "error", message: formatError(error) });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(query);
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
      <CockpitSectionPanel title="提问" badge="自然语言" variant="blueBeam">
        <form onSubmit={onSubmit} className="space-y-3">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={4}
            placeholder="例如：瓦斯超限应该怎么处理？红色风险指标有哪些？D01 依据什么标准？"
            className="console-scrollbar min-h-28 w-full resize-y rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-cyan-200/70"
          />
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  void submit(example);
                }}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1 text-xs text-muted hover:border-cyan-200/55 hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={answer.state === "loading"}
            className="h-10 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-5 text-sm font-medium text-primary transition hover:bg-cyan-300/24 disabled:opacity-60"
          >
            {answer.state === "loading" ? "查询中..." : "查询"}
          </button>
        </form>
      </CockpitSectionPanel>
      <CockpitSectionPanel title="AI 回答与证据" badge={answer.state === "ok" ? "已返回" : "待查询"} variant="blueBeam">
        <AnswerResult answer={answer} />
      </CockpitSectionPanel>
    </div>
  );
}

function CulturePanels() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <CockpitSectionPanel title="文化展板摘要" badge="培训" variant="blueBeam">
        <KnowledgeList items={mockKnowledge.cultureBoards.map((item) => ({ title: item.label, meta: item.value, badge: "文化" }))} />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="展示边界" badge="只读" variant="blueBeam">
        <KnowledgeList
          items={[
            { title: "仅展示静态宣传内容", meta: "不发布正式制度替代文本" },
            { title: "与双控文化展板保持边界", meta: "/double-prevention/culture-board 是双控宣教入口" },
            { title: "案例知识只作学习摘要", meta: "不生成正式事故调查结论" },
          ]}
        />
      </CockpitSectionPanel>
    </div>
  );
}

function AgentPanels() {
  return (
    <div className="grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
      <CockpitSectionPanel title="推荐问题" badge="mock" variant="blueBeam">
        <KnowledgeList items={mockAgent.recommendedQuestions.map((title, index) => ({ title, meta: `推荐问题 ${index + 1}` }))} />
      </CockpitSectionPanel>
      <CockpitSectionPanel title="回答与引用占位" badge="安全提示" variant="blueBeam">
        <div className="space-y-3">
          <p className="rounded-[4px] border border-cyan-300/20 bg-[#031020]/76 p-3 text-sm leading-6 text-ink">{mockAgent.mockAnswer}</p>
          <KnowledgeList items={mockAgent.citations.map((item) => ({ title: item.title, meta: `${item.category} / ${item.scenario}`, desc: item.summary, badge: item.id }))} />
        </div>
      </CockpitSectionPanel>
    </div>
  );
}

function BoundaryStrip({ view }: { view: KnowledgeView }) {
  const apiText = viewCopy[view].mode === "api" ? "API 页面后端不可用时显示 503 待连接，不把空结果伪装为真实生产数据。" : "当前页面使用 mock/静态知识摘要，不接生产知识库。";
  return (
    <div className="rounded-[4px] border border-cyan-300/24 bg-[#031020]/82 px-3 py-2 text-xs leading-5 text-muted">
      {apiText} AI/图谱/规则输出均为辅助解释，不能替代正式制度解释、事故因果认定或人工安全判断。
    </div>
  );
}

function QuickEntry({ href, icon: Icon, title, desc }: { href: string; icon: typeof BookOpen; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex min-w-0 gap-3 rounded-[6px] border border-cyan-300/18 bg-[#031020]/70 p-3 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.07]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border border-cyan-300/28 bg-cyan-300/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{desc}</span>
      </span>
    </Link>
  );
}

function KnowledgeList({ items }: { items: Array<{ title: string; meta: unknown; desc?: unknown; badge?: string; danger?: boolean }> }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={cn("rounded-[4px] border bg-[#031020]/72 px-3 py-2", item.danger ? "border-red-300/28" : "border-cyan-300/18")}>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-ink">{item.title}</p>
              <p className="mt-1 break-words text-xs leading-5 text-muted">{formatValue(item.meta)}</p>
              {item.desc ? <p className="mt-1 break-words text-xs leading-5 text-muted/90">{formatValue(item.desc)}</p> : null}
            </div>
            {item.badge ? <span className="w-fit shrink-0 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2 py-0.5 text-xs text-primary">{item.badge}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StateList<T>({ state, render }: { state: LoadState<T[]>; render: (rows: T[]) => Array<{ title: string; meta: string; desc?: string; badge?: string; danger?: boolean }> }) {
  if (state.state !== "ok") return <Hint state={state} />;
  if (!state.data.length) return <p className="text-sm leading-6 text-muted">暂无数据。</p>;
  return <KnowledgeList items={render(state.data)} />;
}

function Hint<T>({ state }: { state: LoadState<T> }) {
  if (state.state === "loading") return <p className="text-sm leading-6 text-muted">正在加载...</p>;
  if (state.state === "error") return <p className="text-sm leading-6 text-red-200">{state.message}</p>;
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
      {label}
      {children}
    </label>
  );
}

function StatTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value ?? 0}</p>
    </div>
  );
}

function AnswerResult({ answer }: { answer: LoadState<KnowledgeAiAnswer> | { state: "idle" } }) {
  if (answer.state === "idle") return <p className="text-sm leading-6 text-muted">输入问题后点击查询，回答、引用证据和检索边界会展示在此。</p>;
  if (answer.state !== "ok") return <Hint state={answer} />;

  const citations = Array.isArray(answer.data.citations) ? answer.data.citations : [];
  const terms = Array.isArray(answer.data.structured_query?.terms) ? answer.data.structured_query.terms : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={answer.data.mode.startsWith("deepseek:") ? "info" : "warning"}>{answer.data.mode}</StatusBadge>
        <StatusBadge tone="neutral">{answer.data.evidence_count} 条证据</StatusBadge>
        {answer.data.warning ? <StatusBadge tone="warning">{answer.data.warning}</StatusBadge> : null}
      </div>

      <div className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3">
        <p className="mb-2 text-xs font-medium text-primary">回答</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">{answer.data.answer}</p>
      </div>

      {citations.length ? (
        <KnowledgeList
          items={citations.slice(0, 10).map((item, index) => ({
            title: `${index + 1}. ${item.title}`,
            meta: `${item.source_type} / ${item.id}`,
            desc: item.content,
            badge: evidenceBadge(item.source_type),
          }))}
        />
      ) : (
        <p className="text-sm leading-6 text-muted">本次查询未命中知识库证据，回答不可作为精确结论。</p>
      )}

      {terms.length ? (
        <div className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <span key={term} className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.06] px-2 py-0.5 text-xs text-muted">
              {term}
            </span>
          ))}
        </div>
      ) : null}

      <details className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer text-primary">查看原始返回 JSON</summary>
        <pre className="console-scrollbar mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5">
          {JSON.stringify(answer.data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function evidenceBadge(sourceType: string) {
  if (sourceType === "indicator") return "指标";
  if (sourceType === "rule_measure") return "措施";
  if (sourceType === "case") return "案例";
  return "证据";
}

function useKnowledgeOverview(enabled: boolean) {
  const [categories, setCategories] = useState<LoadState<string[]>>({ state: "loading" });
  const [regions, setRegions] = useState<LoadState<string[]>>({ state: "loading" });
  const [highRisk, setHighRisk] = useState<LoadState<KnowledgeIndicator[]>>({ state: "loading" });
  const [stats, setStats] = useState<LoadState<KnowledgeStats>>({ state: "loading" });
  const [pgStatus, setPgStatus] = useState<LoadState<KnowledgePgStatus>>({ state: "loading" });

  useEffect(() => {
    if (!enabled) return;
    load(fetchCategories, setCategories);
    load(fetchRegions, setRegions);
    load(fetchHighRiskIndicators, setHighRisk);
    load(fetchStats, setStats);
    load(fetchPgStatus, setPgStatus);
  }, [enabled]);

  return { categories, regions, highRisk, stats, pgStatus };
}

function useKnowledgeRules(enabled: boolean) {
  const [keyword, setKeyword] = useState("");
  const [indicatorType, setIndicatorType] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<LoadState<KnowledgeIndicator[]>>({ state: "loading" });
  const [rules, setRules] = useState<LoadState<KnowledgeRule[]>>({ state: "loading" });
  const [measures, setMeasures] = useState<LoadState<KnowledgeMeasure[]>>({ state: "loading" });

  useEffect(() => {
    if (!enabled) return;
    load(fetchCategories, (state) => {
      if (state.state === "ok") setCategories(state.data);
    });
    load(fetchRules, setRules);
    load(fetchMeasures, setMeasures);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const filter: IndicatorFilter = {
      keyword: keyword.trim() || undefined,
      indicator_type: indicatorType || undefined,
      category: category || undefined,
    };
    load(() => fetchIndicators(filter), setIndicators);
  }, [category, enabled, indicatorType, keyword]);

  return {
    keyword,
    setKeyword,
    indicatorType,
    setIndicatorType,
    category,
    setCategory,
    categories,
    indicators,
    rules,
    measures,
    reset: () => {
      setKeyword("");
      setIndicatorType("");
      setCategory("");
    },
  };
}

function load<T>(loader: () => Promise<T>, setter: (state: LoadState<T>) => void) {
  let active = true;
  setter({ state: "loading" });
  loader()
    .then((data) => {
      if (active) setter({ state: "ok", data });
    })
    .catch((error) => {
      if (active) setter({ state: "error", message: formatError(error) });
    });
  return () => {
    active = false;
  };
}

function valueOrDash<T>(state: LoadState<T>, pick: (data: T) => number | undefined) {
  return state.state === "ok" ? String(pick(state.data) ?? 0) : "-";
}

function stateBadge<T>(state: LoadState<T>) {
  if (state.state === "loading") return "加载中";
  if (state.state === "error") return "待连接";
  return "已加载";
}

function formatError(error: unknown) {
  if (error instanceof KnowledgeApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
