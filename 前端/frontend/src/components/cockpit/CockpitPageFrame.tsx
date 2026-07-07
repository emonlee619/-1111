"use client";
import { useState, useEffect } from "react";
import { CockpitAmbientLayer, type CockpitAmbientVariant } from "@/components/cockpit/CockpitAmbientLayer";
import { ModuleTabs } from "@/components/cockpit/ModuleTabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  findActiveNavigationItem,
  findNavigationGroup,
  getVisibleNavigationItems,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { BusinessPageContent } from "@/types/business";
import type { RouteMeta } from "@/types/navigation";

type CockpitPageFrameProps = {
  meta: RouteMeta;
  content: BusinessPageContent;
  kicker?: string;
  compactStatus?: string;
  children: React.ReactNode;
  className?: string;
};

const featuredAmbientPaths = new Set([
  "/dashboard",
  "/monitoring",
  "/monitoring/realtime",
  "/monitoring/channels",
  "/warning/events",
  "/double-prevention",
  "/double-prevention/risk-control",
  "/double-prevention/hazard-governance",
  "/double-prevention/review",
  "/data",
  "/data/augmentation",
  "/model/evaluation",
]);

function resolveAmbientVariant(path: string): CockpitAmbientVariant {
  if (path === "/system" || path.startsWith("/system/")) {
    return "subdued";
  }

  if (featuredAmbientPaths.has(path) || path.startsWith("/source-tracing") || path.startsWith("/twin")) {
    return "featured";
  }

  return "standard";
}

export function CockpitPageFrame({
  meta,
  content,
  kicker,
  compactStatus = "mock 数据快照",
  children,
  className,
}: CockpitPageFrameProps) {
  const navigationGroup = findNavigationGroup(content.path);
  const activeItem = navigationGroup ? findActiveNavigationItem(content.path, navigationGroup) : undefined;
  const visibleItems = navigationGroup ? getVisibleNavigationItems(navigationGroup) : [];
  const moduleTitle = cleanDisplayCopy(navigationGroup?.title ?? meta.module);
  const ambientVariant = resolveAmbientVariant(content.path);

  const [currentTime, setCurrentTime] = useState<string>("加载中...");

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString("zh-CN"));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString("zh-CN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={cn("relative isolate min-h-[calc(100vh-112px)] overflow-hidden", className)}>
      <CockpitAmbientLayer variant={ambientVariant} />

      <header className="relative z-10 mb-3 flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{cleanDisplayCopy(meta.title)}</h1>
              <span className="rounded-[4px] border border-cyan-300/24 bg-cyan-300/8 px-2 py-1 text-xs text-primary">
                {moduleTitle}
              </span>
              {kicker ? <span className="text-xs text-muted">{cleanDisplayCopy(kicker)}</span> : null}
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{cleanDisplayCopy(meta.description)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            {compactStatus ? <StatusBadge tone="neutral">{cleanDisplayCopy(compactStatus)}</StatusBadge> : null}
            <StatusBadge tone="info">更新时间：{currentTime}</StatusBadge>
          </div>
        </div>
        {navigationGroup && visibleItems.length > 1 ? (
          <ModuleTabs
            group={navigationGroup}
            activeItem={activeItem}
            ariaLabel={`${moduleTitle}二级入口`}
            className="max-w-full"
            itemClassName="cockpit-chamfer-sm rounded-[4px] px-4 py-2"
          />
        ) : null}
      </header>

      <div className="relative z-10 grid min-w-0 gap-3">
        {children}
      </div>
    </section>
  );
}
