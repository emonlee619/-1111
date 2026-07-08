"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { kbApi, KbApiError } from "@/lib/kb/apiClient";
import type { KbSearchResponse, KbSearchResult } from "@/types/kb";

type LocalState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: KbSearchResponse };

const MODES: Array<{ key: "semantic" | "keyword" | "hybrid"; label: string }> = [
  { key: "hybrid", label: "混合" },
  { key: "semantic", label: "语义" },
  { key: "keyword", label: "关键词" },
];

export function KbSemanticSearchPanel() {
  const [q, setQ] = useState("甲烷浓度超标处置");
  const [mode, setMode] = useState<"semantic" | "keyword" | "hybrid">("hybrid");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [state, setState] = useState<LocalState>({ state: "idle" });

  async function run() {
    setState({ state: "loading" });
    try {
      const env = await kbApi.search({
        q,
        mode,
        category: category || undefined,
        sourceType: sourceType || undefined,
        limit: 20,
      });
      setState({ state: "ok", data: env.data });
    } catch (err) {
      setState({ state: "error", message: err instanceof KbApiError ? err.message : String(err) });
    }
  }

  return (
    <CockpitSectionPanel title="语义检索区" badge="semantic / keyword / hybrid" variant="blueBeam">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="输入关键词或问题，如：上隅角甲烷超标"
            className="h-10 flex-1 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-3 text-sm text-ink outline-none focus:border-cyan-200/70"
          />
          <button
            onClick={run}
            className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-cyan-200/55 bg-cyan-300/16 px-4 text-sm font-medium text-primary"
          >
            <Search className="h-4 w-4" /> 检索
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">模式</span>
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={
                "rounded-[4px] border px-2.5 py-1 text-xs " +
                (mode === m.key ? "border-cyan-200/70 bg-cyan-300/20 text-primary" : "border-cyan-300/20 bg-[#031020]/70 text-muted")
              }
            >
              {m.label}
            </button>
          ))}
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-2 text-xs text-ink">
            <option value="">全部类别</option>
            <option value="dynamic_indicator">动态指标</option>
            <option value="static_risk">静态风险</option>
            <option value="control_measure">管控措施</option>
            <option value="threshold_rule">阈值规则</option>
            <option value="legal_basis">法规依据</option>
          </select>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="h-8 rounded-[4px] border border-cyan-300/20 bg-[#031020]/82 px-2 text-xs text-ink">
            <option value="">全部来源</option>
            <option value="real_sensor">真实传感器</option>
            <option value="physics_constrained">物理约束</option>
            <option value="static_prior">静态先验</option>
            <option value="legal_standard">法规标准</option>
            <option value="system_rule">系统规则</option>
          </select>
        </div>

        {state.state === "idle" ? <p className="text-sm text-muted">输入关键词后点击检索。</p> : null}
        {state.state === "loading" ? <p className="text-sm text-muted">检索中…</p> : null}
        {state.state === "error" ? <p className="text-sm text-red-200">{state.message}</p> : null}
        {state.state === "ok" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <StatusBadge tone="info">检索模式 {state.data.retrievalMode}</StatusBadge>
              <span>命中 {state.data.total} 条</span>
              {state.data.warnings.slice(0, 2).map((w) => (
                <span key={w} className="text-amber-200">{w}</span>
              ))}
            </div>
            {state.data.results.length === 0 ? <p className="text-sm text-muted">无命中结果。</p> : null}
            <ul className="space-y-2">
              {state.data.results.map((r) => (
                <ResultRow key={`${r.target_type}-${r.target_id}`} r={r} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </CockpitSectionPanel>
  );
}

function ResultRow({ r }: { r: KbSearchResult }) {
  const isPhysics = r.source_type === "physics_constrained";
  return (
    <li className="rounded-[4px] border border-cyan-300/18 bg-[#031020]/72 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {r.card_code ? <span className="text-sm font-semibold text-primary">{r.card_code}</span> : null}
        <StatusBadge tone={isPhysics ? "warning" : "info"}>{r.source_type ?? "unknown"}</StatusBadge>
        {r.category ? <StatusBadge tone="neutral">{r.category}</StatusBadge> : null}
        {r.similarity != null ? <span className="font-mono text-xs text-muted">sim {r.similarity.toFixed(3)}</span> : null}
        {r.needs_human_review ? <StatusBadge tone="warning">需人工</StatusBadge> : null}
      </div>
      <p className="mt-1 text-sm text-ink">{r.title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{r.content_preview}</p>
      {r.related_channels && r.related_channels.length > 0 ? (
        <p className="mt-1 text-[11px] text-muted">关联通道：{r.related_channels.join(" / ")}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-primary">引用：{r.citation}</p>
      {r.model_boundary ? <p className="mt-1 text-[11px] text-amber-200">边界：{r.model_boundary}</p> : null}
      {isPhysics ? (
        <p className="mt-1 text-[11px] text-amber-200">⚠ 物理约束指标，仅辅助前兆，不是现场实测，不得单独触发处置。</p>
      ) : null}
    </li>
  );
}
