"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { routeMetaByPath } from "@/config/routeMeta";
import { cn } from "@/lib/cn";
import type { KeyValueItem } from "@/types/business";
import type { MetricCardModel } from "@/types/navigation";
import { riskLevelLabels, type RiskLevel } from "@/types/risk";

export const riskLevelOptions: Array<"all" | RiskLevel> = ["all", "low", "normal", "high", "critical"];
export const workflowOrder = ["整理", "分析", "通报", "整改", "反馈", "验收", "审查", "销号"];

export function useApiResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError(null);
        }
        return loader();
      })
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setData(null);
          setError(err instanceof Error ? err.message : "双重预防 mock API 请求失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loader]);

  return { data, error, loading };
}

export function DoublePreventionShell({
  routePath,
  children,
  metrics,
  boundaryItems = ["mock API 只读展示", "writeEnabled=false", "真实生产接入需后端只读契约复核"],
}: {
  routePath: string;
  children: React.ReactNode;
  metrics?: MetricCardModel[];
  boundaryItems?: string[];
}) {
  const meta = routeMetaByPath[routePath];

  if (!meta) {
    return <EmptyState title="路由元数据缺失" description={`缺少 ${routePath} 的页面定义。`} />;
  }

  return (
    <div className="min-w-0">
      <PageHeader title={meta.title} module={meta.module} description={meta.description} status={meta.status} />
      {metrics?.length ? (
        <div className="mb-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      ) : null}
      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {boundaryItems.map((item) => (
          <StatusBadge key={item} tone="neutral">{item}</StatusBadge>
        ))}
      </div>
      {children}
    </div>
  );
}

export function ResourceState<T>({
  loading,
  error,
  data,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  data: T | null;
  empty?: boolean;
  children: (data: T) => React.ReactNode;
}) {
  if (loading) {
    return <EmptyState title="正在读取 mock API" description="页面通过 /api/double-prevention/* 拉取数据。" />;
  }
  if (error) {
    return <EmptyState title="接口读取失败" description={error} />;
  }
  if (!data || empty) {
    return <EmptyState title="未找到记录" description="mock API 返回空数据或 404，页面保留空状态，不默认展示第一条。" />;
  }
  return <>{children(data)}</>;
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-[140px] flex-1 text-xs font-medium text-muted sm:max-w-[220px]">
      {label}
      <select
        className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-orange-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "全部" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder = "关键词搜索" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="min-w-[180px] flex-[2] text-xs font-medium text-muted">
      搜索
      <input
        className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-orange-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex min-w-0 flex-wrap gap-2.5">{children}</div>;
}

export function riskOptionLabel(option: string) {
  return option === "all" ? "全部" : riskLevelLabels[option as RiskLevel] ?? option;
}

export function uniqueOptions(values: Array<string | undefined>) {
  return ["all", ...Array.from(new Set(values.filter(Boolean) as string[]))];
}

export function matchKeyword(values: Array<string | undefined>, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export function KeyValueGrid({ items }: { items: KeyValueItem[] }) {
  return (
    <div className="grid min-w-0 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="min-w-0 rounded-[12px] border border-line bg-card p-3.5">
          <p className="text-xs font-medium text-muted">{item.label}</p>
          <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-ink">{String(item.value)}</p>
          {item.hint ? <p className="mt-1 text-xs leading-5 text-muted">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function BoundaryCard({ items, title = "边界说明" }: { items: string[]; title?: string }) {
  return (
    <ConsoleCard title={title}>
      <ul className="space-y-1.5 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </ConsoleCard>
  );
}

export function SourceBadge({ sourceType }: { sourceType?: string }) {
  const label = sourceType === "physics_constrained" ? "辅助复核" : sourceType === "real_sensor" ? "真实传感器" : sourceType === "static_prior" ? "静态先验" : "人工检查";
  const tone = sourceType === "real_sensor" ? "success" : sourceType === "physics_constrained" ? "warning" : "neutral";
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

export function RiskTableLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="font-semibold text-primary transition hover:text-orange-700" href={href}>
      {children}
    </Link>
  );
}

export function RiskLevelSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = useMemo(() => riskLevelOptions.map((option) => (option === "all" ? "all" : riskOptionLabel(option))), []);
  return (
    <label className="min-w-[140px] flex-1 text-xs font-medium text-muted sm:max-w-[220px]">
      风险等级
      <select
        className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-orange-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {riskLevelOptions.map((option, index) => (
          <option key={option} value={option}>
            {options[index]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[13px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-line px-2.5 py-2.5 font-semibold text-muted">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-line/70 px-2.5 py-2.5 leading-6 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkflowStrip({ steps, currentStep }: { steps: Array<{ name: string; owner: string; time: string; status: string; materialSummary: string; nextHint: string }>; currentStep?: string }) {
  const sorted = workflowOrder.map((name) => steps.find((step) => step.name === name)).filter(Boolean) as typeof steps;
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sorted.map((step, index) => {
        const active = step.name === currentStep || step.status === "active";
        return (
          <div key={step.name} className={cn("min-w-0 rounded-[14px] border p-3.5", active ? "border-orange-300 bg-orange-50/70" : "border-line bg-card")}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-primary">步骤 {index + 1}</p>
              <StatusBadge tone={step.status === "done" ? "success" : active ? "warning" : "neutral"}>{step.status}</StatusBadge>
            </div>
            <p className="mt-2 text-lg font-semibold text-ink">{step.name}</p>
            <p className="mt-2 text-sm text-muted">责任：{step.owner}</p>
            <p className="mt-1 text-sm text-muted">时间：{step.time}</p>
            <p className="mt-3 text-sm leading-6 text-ink">{step.materialSummary}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{step.nextHint}</p>
          </div>
        );
      })}
    </div>
  );
}

export function DetailActions({ listHref }: { listHref: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link className="rounded-[12px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-orange-300" href={listHref}>
        返回列表
      </Link>
    </div>
  );
}
