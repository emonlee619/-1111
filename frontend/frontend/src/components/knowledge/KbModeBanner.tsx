"use client";

import { ShieldAlert, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { KbApiMode } from "@/types/kb";

type Props = {
  mode: KbApiMode;
  semanticAvailable: boolean;
  embeddingDims: number | null;
  lastUpdatedAt: string | null;
  warningCount: number;
};

export function KbModeBanner({ mode, semanticAvailable, embeddingDims, lastUpdatedAt, warningCount }: Props) {
  const modeTone = mode === "online" ? "success" : mode === "degraded" ? "warning" : "danger";
  const ModeIcon = mode === "offline" ? WifiOff : Wifi;
  return (
    <div className="rounded-[7px] border border-cyan-300/24 bg-[#061a31]/82 px-4 py-3 shadow-card backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <ModeIcon className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">知识中枢运行模式</span>
        <StatusBadge tone={modeTone}>
          {mode === "online" ? "online · Supabase 已连接" : mode === "degraded" ? "degraded · 受限" : "offline · 未连接"}
        </StatusBadge>
        <StatusBadge tone={semanticAvailable ? "success" : "warning"}>
          {semanticAvailable ? `语义检索可用 · ${embeddingDims ?? "?"}维` : "语义检索不可用 · 关键词降级"}
        </StatusBadge>
        <StatusBadge tone="info">关键词检索可用</StatusBadge>
        <StatusBadge tone="warning">
          <ShieldAlert className="mr-1 inline h-3 w-3" />
          浏览器不直连 Supabase · service role 仅服务端
        </StatusBadge>
        <StatusBadge tone="neutral">
          <ShieldCheck className="mr-1 inline h-3 w-3" />
          RLS 保护
        </StatusBadge>
        {warningCount > 0 ? <StatusBadge tone="warning">{warningCount} 条提示</StatusBadge> : null}
        {lastUpdatedAt ? (
          <span className="ml-auto text-xs text-muted">最近更新 {new Date(lastUpdatedAt).toLocaleString("zh-CN")}</span>
        ) : null}
      </div>
    </div>
  );
}
