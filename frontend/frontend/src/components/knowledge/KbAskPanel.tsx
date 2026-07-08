"use client";

import { useState } from "react";
import { MessageSquareText, ShieldAlert } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { kbApi, KbApiError } from "@/lib/kb/apiClient";
import { KbCitationPanel } from "./KbCitationPanel";
import type { KbAskResponse } from "@/types/kb";

type LocalState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: KbAskResponse };

const CONF_TONE = { high: "success", medium: "info", low: "warning", none: "danger" } as const;

export function KbAskPanel() {
  const [question, setQuestion] = useState("B01-B41 能不能直接触发撤人或断电？");
  const [state, setState] = useState<LocalState>({ state: "idle" });

  async function ask() {
    setState({ state: "loading" });
    try {
      const env = await kbApi.ask(question);
      setState({ state: "ok", data: env.data });
    } catch (err) {
      setState({ state: "error", message: err instanceof KbApiError ? err.message : String(err) });
    }
  }

  return (
    <CockpitSectionPanel title="RAG 问答区" badge="规则式 · 引用必填" variant="blueBeam">
      <div className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-cyan-200/70"
        />
        <button
          onClick={ask}
          className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary"
        >
          <MessageSquareText className="h-4 w-4" /> 引用知识库回答
        </button>

        {state.state === "idle" ? <p className="text-sm text-muted">输入问题后点击回答。涉及断电/撤人/重大隐患将自动标记需人工复核。</p> : null}
        {state.state === "loading" ? <p className="text-sm text-muted">检索证据并生成回答…</p> : null}
        {state.state === "error" ? <p className="text-sm text-red-200">{state.message}</p> : null}
        {state.state === "ok" ? <AnswerView data={state.data} /> : null}
      </div>
    </CockpitSectionPanel>
  );
}

function AnswerView({ data }: { data: KbAskResponse }) {
  const confTone = CONF_TONE[data.confidence];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">检索 {data.retrievalMode}</StatusBadge>
        <StatusBadge tone={confTone}>置信度 {data.confidence}</StatusBadge>
        <StatusBadge tone="neutral">证据覆盖 {Math.round(data.sourceCoverage * 100)}%</StatusBadge>
        {data.needsHumanReview ? (
          <StatusBadge tone="danger">
            <ShieldAlert className="mr-1 inline h-3 w-3" />
            需人工复核
          </StatusBadge>
        ) : null}
      </div>

      <p className="whitespace-pre-wrap rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 p-3 text-sm leading-7 text-ink">
        {data.answer}
      </p>

      <KbCitationPanel citations={data.citations} retrieved={data.retrieved} />

      {data.warnings.length > 0 ? (
        <ul className="space-y-1">
          {data.warnings.map((w) => (
            <li key={w} className="text-[11px] leading-5 text-amber-200">· {w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
