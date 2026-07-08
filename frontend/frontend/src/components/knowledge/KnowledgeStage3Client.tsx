"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, FileText, MessageSquareText, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { CockpitAmbientLayer } from "@/components/cockpit/CockpitAmbientLayer";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { KnowledgeCard, KnowledgeGraph, KnowledgeStats, RagAnswer } from "@/lib/knowledge/types";

type Mode = "overview" | "search" | "graph" | "ask" | "card" | "admin" | "review" | "report";
type LoadState<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ok"; data: T };
type MetricItem = { label: string; value: number | undefined; Icon: LucideIcon | typeof DatabaseIcon };

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "knowledge api failed");
  return payload.data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "knowledge api failed");
  return payload.data as T;
}

export function KnowledgeStage3Client({ mode, cardCode }: { mode: Mode; cardCode?: string }) {
  return (
    <section className="relative isolate min-h-[calc(100vh-112px)] overflow-hidden">
      <CockpitAmbientLayer variant="featured" />
      <div className="relative z-10 space-y-3">
        <KnowledgeHeader mode={mode} />
        {mode === "overview" ? <OverviewPanel /> : null}
        {mode === "search" ? <SearchPanel /> : null}
        {mode === "graph" ? <GraphPanel /> : null}
        {mode === "ask" ? <AskPanel /> : null}
        {mode === "card" ? <CardPanel cardCode={cardCode ?? ""} /> : null}
        {mode === "admin" ? <AdminPanel /> : null}
        {mode === "review" ? <ReviewPanel /> : null}
        {mode === "report" ? <ReportPanel /> : null}
      </div>
    </section>
  );
}

function KnowledgeHeader({ mode }: { mode: Mode }) {
  const titleMap: Record<Mode, string> = {
    overview: "知识库总览",
    search: "知识检索",
    graph: "致灾图谱",
    ask: "AI 证据问答",
    card: "知识卡详情",
    admin: "知识库管理",
    review: "人工审核",
    report: "报告生成",
  };
  const nav = [
    ["/knowledge", "总览"],
    ["/knowledge/search", "检索"],
    ["/knowledge/graph", "图谱"],
    ["/knowledge/ask", "问答"],
    ["/knowledge/review", "审核"],
    ["/knowledge/admin", "管理"],
    ["/reports/generate", "报告"],
  ];
  return (
    <header className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/82 px-4 py-4 shadow-card backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-primary">Supabase 知识库 / Next.js API</span>
        <StatusBadge tone="info">RAG</StatusBadge>
        <StatusBadge tone="warning">人工审核边界</StatusBadge>
      </div>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{titleMap[mode]}</h1>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-muted">
            所有页面通过 `/api/knowledge/*` 访问知识库。AI 回答和报告必须带 citations，physics_constrained 始终提示边界。
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-[4px] border border-cyan-300/20 bg-[#031020]/70 px-3 py-1.5 text-xs text-muted hover:text-primary">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function OverviewPanel() {
  const stats = useApi<{ stats: KnowledgeStats }>("/api/knowledge/admin/stats");
  const cards = useApi<KnowledgeCard[]>("/api/knowledge/search?limit=8");
  const metrics = stats.state === "ok" ? stats.data.stats : null;
  const metricItems: MetricItem[] = [
    { label: "知识卡", value: metrics?.cards, Icon: DatabaseIcon },
    { label: "规则", value: metrics?.rules, Icon: ShieldCheck },
    { label: "模板", value: metrics?.templates, Icon: FileText },
    { label: "待审核", value: metrics?.pending_reviews, Icon: BookOpen },
    { label: "文献", value: metrics?.source_documents, Icon: Search },
  ];
  return (
    <>
      <div className="grid gap-3 md:grid-cols-5">
        {metricItems.map(({ label, value, Icon }) => (
          <article key={label} className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/78 p-4">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{value ?? "-"}</p>
          </article>
        ))}
      </div>
      <CockpitSectionPanel title="最近知识卡" badge="published" variant="blueBeam">
        <CardList state={cards} />
      </CockpitSectionPanel>
    </>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState("B01");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [channel, setChannel] = useState("");
  const [url, setUrl] = useState("/api/knowledge/search?limit=30");
  const cards = useApi<KnowledgeCard[]>(url);

  function runSearch() {
    const params = new URLSearchParams({ limit: "30" });
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (sourceType) params.set("source_type", sourceType);
    if (channel.trim()) params.set("channel", channel.trim());
    setUrl(`/api/knowledge/search?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
      <CockpitSectionPanel title="筛选" badge="search" variant="blueBeam">
        <div className="space-y-3">
          <Input label="关键词" value={query} onChange={setQuery} />
          <Input label="通道" value={channel} onChange={setChannel} placeholder="R01 / B14 / S01" />
          <Select label="类别" value={category} onChange={setCategory} options={["", "dynamic_indicator", "static_risk", "control_measure", "ai_guardrail"]} />
          <Select label="来源类型" value={sourceType} onChange={setSourceType} options={["", "real_sensor", "physics_constrained", "static_prior", "system_rule"]} />
          <button onClick={runSearch} className="h-10 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary">
            检索
          </button>
        </div>
      </CockpitSectionPanel>
      <CockpitSectionPanel title="结果" badge="cards" variant="blueBeam">
        <CardList state={cards} />
      </CockpitSectionPanel>
    </div>
  );
}

function GraphPanel() {
  const graph = useApi<KnowledgeGraph>("/api/knowledge/graph?limit=100");
  return (
    <CockpitSectionPanel title="指标到措施的简化图谱" badge="nodes / edges" variant="blueBeam">
      {graph.state === "ok" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            {graph.data.nodes.slice(0, 40).map((node) => (
              <div key={node.id} className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-2 text-sm text-ink">
                <span className="font-semibold text-primary">{node.id}</span> {node.label}
                <p className="text-xs text-muted">{node.type} {node.source_type ? `/ ${node.source_type}` : ""}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {graph.data.edges.slice(0, 60).map((edge) => (
              <div key={edge.id} className="rounded-[4px] border border-cyan-300/18 bg-cyan-300/[0.06] p-2 text-xs text-muted">
                {`${edge.source} -> ${edge.target} / ${edge.relation_type}`}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <StateHint state={graph} />
      )}
    </CockpitSectionPanel>
  );
}

function AskPanel() {
  const [question, setQuestion] = useState("B01-B41 能不能直接触发撤人或断电？");
  const [answer, setAnswer] = useState<LoadState<RagAnswer> | { state: "idle" }>({ state: "idle" });

  async function ask() {
    setAnswer({ state: "loading" });
    try {
      setAnswer({ state: "ok", data: await apiPost<RagAnswer>("/api/knowledge/ask", { question }) });
    } catch (error) {
      setAnswer({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <CockpitSectionPanel title="AI 问答" badge="citations required" variant="blueBeam">
      <div className="space-y-3">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} className="w-full rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 py-2 text-sm leading-6 text-ink outline-none" />
        <button onClick={ask} className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary">
          <MessageSquareText className="h-4 w-4" /> 引用知识库回答
        </button>
        {answer.state === "ok" ? <AnswerView data={answer.data} /> : <StateHint state={answer} />}
      </div>
    </CockpitSectionPanel>
  );
}

function CardPanel({ cardCode }: { cardCode: string }) {
  const card = useApi<KnowledgeCard>(`/api/knowledge/cards/${encodeURIComponent(cardCode)}`);
  const relations = useApi<unknown[]>(`/api/knowledge/relations/${encodeURIComponent(cardCode)}`);
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_420px]">
      <CockpitSectionPanel title="知识卡详情" badge={cardCode} variant="blueBeam">
        {card.state === "ok" ? <CardDetail card={card.data} /> : <StateHint state={card} />}
      </CockpitSectionPanel>
      <CockpitSectionPanel title="关系" badge="graph" variant="blueBeam">
        {relations.state === "ok" ? <pre className="whitespace-pre-wrap text-xs leading-5 text-muted">{JSON.stringify(relations.data, null, 2)}</pre> : <StateHint state={relations} />}
      </CockpitSectionPanel>
    </div>
  );
}

function AdminPanel() {
  const admin = useApi<{ stats: KnowledgeStats }>("/api/knowledge/admin/stats");
  return (
    <CockpitSectionPanel title="统计与导入状态" badge="server only" variant="blueBeam">
      {admin.state === "ok" ? <pre className="whitespace-pre-wrap text-sm leading-6 text-muted">{JSON.stringify(admin.data.stats, null, 2)}</pre> : <StateHint state={admin} />}
    </CockpitSectionPanel>
  );
}

function ReviewPanel() {
  const review = useApi<{ review: { cards: KnowledgeCard[]; tasks: unknown[] } }>("/api/knowledge/admin/stats");
  return (
    <CockpitSectionPanel title="待人工审核" badge="needs_human_review" variant="blueBeam">
      {review.state === "ok" ? (
        <div className="space-y-4">
          <CardList state={{ state: "ok", data: review.data.review.cards }} />
          <pre className="whitespace-pre-wrap text-xs text-muted">{JSON.stringify(review.data.review.tasks, null, 2)}</pre>
        </div>
      ) : (
        <StateHint state={review} />
      )}
    </CockpitSectionPanel>
  );
}

function ReportPanel() {
  const [reportType, setReportType] = useState("warning_report");
  const [topic, setTopic] = useState("B01-B41 物理约束指标预警边界");
  const [report, setReport] = useState<LoadState<{ generated_content: string; citations: unknown[]; warnings: string[] }> | { state: "idle" }>({ state: "idle" });
  async function generate() {
    setReport({ state: "loading" });
    try {
      setReport({ state: "ok", data: await apiPost("/api/knowledge/reports/generate", { report_type: reportType, topic }) });
    } catch (error) {
      setReport({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }
  return (
    <CockpitSectionPanel title="报告草稿" badge="citations" variant="blueBeam">
      <div className="space-y-3">
        <Select label="报告类型" value={reportType} onChange={setReportType} options={["warning_report", "rectification_report", "review_report"]} />
        <Input label="主题" value={topic} onChange={setTopic} />
        <button onClick={generate} className="h-10 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary">生成报告草稿</button>
        {report.state === "ok" ? (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3 text-sm leading-6 text-ink">{report.data.generated_content}</pre>
            <pre className="whitespace-pre-wrap text-xs text-muted">{JSON.stringify(report.data.citations, null, 2)}</pre>
          </div>
        ) : (
          <StateHint state={report} />
        )}
      </div>
    </CockpitSectionPanel>
  );
}

function CardList({ state }: { state: LoadState<KnowledgeCard[]> }) {
  if (state.state !== "ok") return <StateHint state={state} />;
  if (state.data.length === 0) return <p className="text-sm text-muted">暂无知识卡。阶段二导入后会显示真实数据。</p>;
  return (
    <ul className="space-y-2">
      {state.data.map((card) => (
        <li key={card.card_code} className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/knowledge/cards/${card.card_code}`} className="text-sm font-semibold text-primary hover:underline">{card.card_code}</Link>
            <StatusBadge tone={card.source_type === "physics_constrained" ? "warning" : "info"}>{card.source_type ?? "unknown"}</StatusBadge>
            {card.needs_human_review ? <StatusBadge tone="warning">需审核</StatusBadge> : null}
          </div>
          <p className="mt-1 text-sm text-ink">{card.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{card.summary}</p>
          {card.model_boundary ? <p className="mt-1 text-xs leading-5 text-amber-200">{card.model_boundary}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function CardDetail({ card }: { card: KnowledgeCard }) {
  return (
    <div className="space-y-3 text-sm leading-6">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="info">{card.category}</StatusBadge>
        <StatusBadge tone={card.source_type === "physics_constrained" ? "warning" : "info"}>{card.source_type ?? "unknown"}</StatusBadge>
      </div>
      <h2 className="text-xl font-semibold text-ink">{card.title}</h2>
      <p className="text-muted">{card.summary}</p>
      {[
        ["物理意义", card.physical_meaning],
        ["异常表现", card.abnormal_signs?.join("；")],
        ["复核动作", card.verification_actions?.join("；")],
        ["管控措施", card.control_measures?.join("；")],
        ["法规依据", card.legal_basis?.join("；")],
        ["阈值规则", JSON.stringify(card.threshold_rules ?? {})],
        ["边界说明", card.model_boundary],
        ["人工审核", card.human_review_policy],
      ].map(([label, value]) => (
        <div key={label} className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-ink">{value || "-"}</p>
        </div>
      ))}
    </div>
  );
}

function AnswerView({ data }: { data: RagAnswer }) {
  return (
    <div className="space-y-3">
      <p className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3 text-sm leading-7 text-ink">{data.answer}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {data.citations.map((item) => (
          <div key={item.card_code} className="rounded-[4px] border border-cyan-300/18 bg-cyan-300/[0.06] p-2 text-xs text-muted">
            {item.card_code} / {item.title}
          </div>
        ))}
      </div>
      {data.warnings.map((warning) => <p key={warning} className="text-xs leading-5 text-amber-200">{warning}</p>)}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none">
        {options.map((option) => <option key={option} value={option}>{option || "全部"}</option>)}
      </select>
    </label>
  );
}

function StateHint<T>({ state }: { state: LoadState<T> | { state: "idle" } }) {
  if (state.state === "idle") return <p className="text-sm leading-6 text-muted">等待操作。</p>;
  if (state.state === "loading") return <p className="text-sm leading-6 text-muted">正在加载...</p>;
  if (state.state === "error") return <p className="text-sm leading-6 text-red-200">{state.message}</p>;
  return null;
}

function useApi<T>(path: string): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ state: "loading" });
  useEffect(() => {
    let active = true;
    apiGet<T>(path)
      .then((data) => active && setState({ state: "ok", data }))
      .catch((error) => active && setState({ state: "error", message: error instanceof Error ? error.message : String(error) }));
    return () => {
      active = false;
    };
  }, [path]);
  return state;
}

function DatabaseIcon(props: { className?: string }) {
  return <BookOpen {...props} />;
}
