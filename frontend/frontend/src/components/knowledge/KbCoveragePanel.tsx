"use client";

import { BookOpen, FileText, FlaskConical, FolderArchive, ScrollText, Truck, Wrench } from "lucide-react";
import { CockpitSectionPanel } from "@/components/cockpit/CockpitSectionPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { KbCoverage } from "@/types/kb";

type Props = { coverage: KbCoverage | null; loading?: boolean; error?: string | null };

const TYPE_META: Record<string, { label: string; icon: typeof FileText }> = {
  law: { label: "法律法规", icon: ScrollText },
  regulation: { label: "部门规章", icon: BookOpen },
  standard: { label: "技术标准", icon: FlaskConical },
  "accident-report": { label: "事故案例", icon: FileText },
  "equipment-manual": { label: "设备手册", icon: Wrench },
  "project-data": { label: "工程资料", icon: FolderArchive },
  "project-document": { label: "项目文档", icon: Truck },
};

export function KbCoveragePanel({ coverage, loading, error }: Props) {
  const byType = coverage?.sourceDocumentsByType ?? {};
  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  const reasons = Object.entries(coverage?.reviewTasksByReason ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <CockpitSectionPanel title="资料覆盖区" badge="source_documents" variant="blueBeam">
      {loading ? <p className="text-sm text-muted">正在加载资料分类…</p> : null}
      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <p className="text-xs text-muted">已入库资料 {total} 份，按类型分布：</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const count = byType[key] ?? 0;
          const Icon = meta.icon;
          return (
            <div key={key} className="rounded-[5px] border border-cyan-300/18 bg-[#031020]/72 p-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-ink">{meta.label}</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-ink">{count}</p>
              <p className="text-[10px] text-muted">{key}</p>
            </div>
          );
        })}
        {/* 未归类兜底 */}
        {Object.keys(byType).some((k) => !TYPE_META[k]) ? (
          <div className="rounded-[5px] border border-cyan-300/18 bg-[#031020]/72 p-2">
            <span className="text-xs text-muted">其它类型</span>
            <p className="mt-1 text-xl font-semibold text-ink">
              {Object.entries(byType).filter(([k]) => !TYPE_META[k]).reduce((a, [, v]) => a + v, 0)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-[5px] border border-cyan-300/18 bg-[#031020]/72 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">审核任务按原因分组（共 {reasons.reduce((a, [, v]) => a + v, 0)} 条）</p>
          <StatusBadge tone="warning">需人工</StatusBadge>
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {reasons.length === 0 ? <li className="text-xs text-muted">暂无</li> : null}
          {reasons.slice(0, 10).map(([reason, count]) => (
            <li key={reason} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink" title={reason}>{reason || "未分类"}</span>
              <span className="font-mono text-primary">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </CockpitSectionPanel>
  );
}
