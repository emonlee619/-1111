"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Database, FileText, MessageSquareText, ShieldCheck } from "lucide-react";
import { CockpitAmbientLayer } from "@/components/cockpit/CockpitAmbientLayer";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Summary = {
  counts: Record<string, number>;
  cards: Array<{ card_code: string; title: string; source_type: string | null; summary: string | null; model_boundary: string | null }>;
  rules: Array<{ rule_code: string; title: string; boundary_notes: string | null }>;
  templates: Array<{ template_code: string; title: string; template_type: string }>;
};

type Answer = {
  answer: string;
  citations: Array<{ card_code: string; title: string; summary: string | null; source_type: string | null }>;
  warnings: string[];
};

type LoadState<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ok"; data: T };

export function KnowledgeCenterClient() {
  const [summary, setSummary] = useState<LoadState<Summary>>({ state: "loading" });
  const [question, setQuestion] = useState("B01-B41 能不能直接触发撤人或断电？");
  const [answer, setAnswer] = useState<LoadState<Answer> | { state: "idle" }>({ state: "idle" });

  useEffect(() => {
    fetch("/api/kb/summary", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "知识库接口不可用");
        setSummary({ state: "ok", data: payload.data });
      })
      .catch((error) => setSummary({ state: "error", message: error instanceof Error ? error.message : String(error) }));
  }, []);

  const metrics = useMemo(() => {
    const counts = summary.state === "ok" ? summary.data.counts : {};
    return [
      { label: "知识卡", value: counts.published_cards ?? "-", icon: Database },
      { label: "规则", value: counts.published_rules ?? "-", icon: ShieldCheck },
      { label: "模板", value: counts.published_templates ?? "-", icon: FileText },
      { label: "物理约束卡", value: counts.physics_constrained_cards ?? "-", icon: BookOpen }
    ];
  }, [summary]);

  async function ask() {
    setAnswer({ state: "loading" });
    try {
      const response = await fetch("/api/kb/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "问答接口不可用");
      setAnswer({ state: "ok", data: payload.data });
    } catch (error) {
      setAnswer({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <section className="relative isolate min-h-[calc(100vh-112px)] overflow-hidden">
      <CockpitAmbientLayer variant="featured" />
      <div className="relative z-10 space-y-3">
        <header className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/82 px-4 py-4 shadow-card backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary">Supabase 知识库 / AI 知识智能中枢</span>
            <StatusBadge tone="info">63 通道</StatusBadge>
            <StatusBadge tone="warning">人工复核</StatusBadge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">企业级知识库与 AI 证据中枢</h1>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-muted">
            统一读取 Supabase 知识卡、规则、模板和问答证据。通道数量以后端 meta、sensors/latest、stats 为准；R01-R22 为真实传感器，B01-B41 为物理约束生成/估计指标。
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/78 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{metric.value}</p>
                </div>
                <metric.icon className="h-5 w-5 text-primary" />
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <CockpitSectionPanel title="已发布知识卡" badge={summary.state === "ok" ? "Supabase" : "待连接"} variant="blueBeam">
            {summary.state === "ok" ? (
              <ul className="space-y-2">
                {summary.data.cards.map((card) => (
                  <li key={card.card_code} className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{card.card_code}</span>
                      <StatusBadge tone={card.source_type === "physics_constrained" ? "warning" : "info"}>{card.source_type ?? "unknown"}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-ink">{card.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{card.summary}</p>
                    {card.model_boundary ? <p className="mt-1 text-xs leading-5 text-amber-200">{card.model_boundary}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <StateHint state={summary} />
            )}
          </CockpitSectionPanel>

          <CockpitSectionPanel title="证据问答" badge="RAG guardrail" variant="blueBeam">
            <div className="space-y-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                className="w-full resize-y rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-cyan-200/70"
              />
              <button onClick={ask} className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary">
                <MessageSquareText className="h-4 w-4" />
                引用知识库回答
              </button>
              {answer.state === "ok" ? (
                <div className="space-y-2">
                  <p className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3 text-sm leading-7 text-ink">{answer.data.answer}</p>
                  {answer.data.citations.map((item) => (
                    <div key={item.card_code} className="rounded-[4px] border border-cyan-300/18 bg-cyan-300/[0.06] p-2 text-xs text-muted">
                      {item.card_code} / {item.title}
                    </div>
                  ))}
                  {answer.data.warnings.map((warning) => (
                    <p key={warning} className="text-xs leading-5 text-amber-200">{warning}</p>
                  ))}
                </div>
              ) : (
                <StateHint state={answer} />
              )}
            </div>
          </CockpitSectionPanel>
        </div>
      </div>
    </section>
  );
}

function StateHint<T>({ state }: { state: LoadState<T> | { state: "idle" } }) {
  if (state.state === "idle") return <p className="text-sm leading-6 text-muted">等待查询。</p>;
  if (state.state === "loading") return <p className="text-sm leading-6 text-muted">正在加载...</p>;
  if (state.state === "error") return <p className="text-sm leading-6 text-red-200">{state.message}</p>;
  return null;
}
