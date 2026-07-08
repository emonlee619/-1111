"use client";

import { Cpu, Database, ShieldCheck } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  mode: "online" | "degraded" | "offline";
  semanticAvailable: boolean;
  embeddingDims: number | null;
  lastUpdatedAt: string | null;
  warnings: string[];
};

export function KbSystemStatusPanel({ mode, semanticAvailable, embeddingDims, lastUpdatedAt, warnings }: Props) {
  const supabaseConnected = mode !== "offline";
  const rows: Array<{ label: string; node: React.ReactNode }> = [
    {
      label: "Supabase 连接",
      node: <StatusBadge tone={supabaseConnected ? "success" : "danger"}>{supabaseConnected ? "connected" : "disconnected"}</StatusBadge>,
    },
    {
      label: "embedding 维度",
      node: <StatusBadge tone={embeddingDims === 384 ? "success" : "warning"}>{embeddingDims ?? "未知"} 维</StatusBadge>,
    },
    {
      label: "语义检索（TF-IDF+SVD）",
      node: <StatusBadge tone={semanticAvailable ? "success" : "warning"}>{semanticAvailable ? "available" : "unavailable"}</StatusBadge>,
    },
    {
      label: "关键词降级检索",
      node: <StatusBadge tone="success">available</StatusBadge>,
    },
    {
      label: "RLS / service role 安全",
      node: (
        <StatusBadge tone="info">
          <ShieldCheck className="mr-1 inline h-3 w-3" />
          浏览器仅经 /api/kb/* 读取
        </StatusBadge>
      ),
    },
    {
      label: "最近拉取时间",
      node: <span className="text-xs text-muted">{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString("zh-CN") : "—"}</span>,
    },
  ];

  return (
    <CockpitSectionPanel title="系统状态" badge="system" variant="blueBeam">
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 rounded-[5px] border border-cyan-300/16 bg-[#031020]/72 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-muted">
              <Database className="h-3.5 w-3.5 text-primary" />
              {row.label}
            </span>
            {row.node}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-[5px] border border-cyan-300/16 bg-cyan-300/[0.05] px-3 py-2">
        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[11px] leading-5 text-muted">
          embedding 通过 Node 子进程调用 <code className="text-primary">scripts/kb/stage3-embed-query.py</code> 复用本地 TF-IDF+SVD pkl，不依赖 DeepSeek / HuggingFace 在线下载。
        </p>
      </div>
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {warnings.slice(0, 4).map((w) => (
            <li key={w} className="text-[11px] leading-5 text-amber-200">· {w}</li>
          ))}
        </ul>
      ) : null}
    </CockpitSectionPanel>
  );
}
