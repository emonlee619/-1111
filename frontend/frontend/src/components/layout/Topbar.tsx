"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, ShieldCheck, UserRound } from "lucide-react";
import {
  findNavigationGroup,
  getVisibleNavigationItems,
  matchesNavigationGroup,
  navigation,
} from "@/config/navigation";
import { cn } from "@/lib/cn";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const activeGroup = findNavigationGroup(pathname);
  const topNavGroups = navigation.filter((group) => group.visibleInTopNav !== false);
  const midpoint = Math.ceil(topNavGroups.length / 2);
  const leftNavGroups = topNavGroups.slice(0, midpoint);
  const rightNavGroups = topNavGroups.slice(midpoint);

  function renderNavGroup(group: (typeof topNavGroups)[number]) {
    const href = group.href ?? getVisibleNavigationItems(group)[0]?.href ?? "/dashboard";
    const active = activeGroup?.title === group.title || matchesNavigationGroup(pathname, group);

    return (
      <Link
        key={group.title}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "mine-top-tab cockpit-chamfer-sm",
          active && "mine-top-tab--active",
        )}
      >
        <span className="mine-top-tab__dot" aria-hidden />
        <span className="mine-top-tab__label">{group.title}</span>
      </Link>
    );
  }

  return (
    <header className="mine-topbar sticky top-0 z-30 border-b border-cyan-300/20 bg-[#03101f]/88 shadow-[0_1px_26px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
      <div className="mx-auto max-w-[1680px] px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center gap-2 lg:hidden">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-primary shadow-soft transition hover:border-[var(--mine-border-strong)] hover:shadow-glow"
            onClick={onMenuClick}
            aria-label="打开导航"
          >
            <Menu size={18} />
          </button>
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
            aria-label="进入综合驾驶舱"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--mine-border-strong)] bg-primary text-[#03101f] shadow-glow">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink sm:text-sm">警溯双控-瓦斯灾害管控平台</p>
            </div>
          </Link>
          <div className="ml-auto hidden shrink-0 items-center gap-1.5 sm:flex">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-muted shadow-soft transition hover:border-[var(--mine-border-strong)] hover:text-primary hover:shadow-glow" aria-label="告警入口">
              <Bell size={18} />
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-muted shadow-soft transition hover:border-[var(--mine-border-strong)] hover:text-primary hover:shadow-glow" aria-label="用户入口">
              <UserRound size={18} />
            </button>
          </div>
        </div>

        <div className="relative hidden min-h-[92px] items-center lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,430px)_minmax(0,1fr)] lg:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)_minmax(0,1fr)]">
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-cyan-300/30 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
          <nav
            aria-label="左侧一级模块导航"
            className="console-scrollbar mine-topbar__nav overflow-x-auto xl:justify-end"
          >
            {leftNavGroups.map(renderNavGroup)}
          </nav>

          <Link href="/dashboard" className="mine-platform-title" aria-label="进入综合驾驶舱">
            <span className="mine-platform-title__wing mine-platform-title__wing--left" aria-hidden />
            <span className="mine-platform-title__body">
              <span className="mine-platform-title__scan" aria-hidden />
              <span className="mine-platform-title__main">警溯双控-瓦斯灾害管控平台</span>
              <span className="mine-platform-title__sub">GAS OUTBURST CONTROL CONSOLE</span>
            </span>
            <span className="mine-platform-title__wing mine-platform-title__wing--right" aria-hidden />
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <nav
              aria-label="右侧一级模块导航"
              className="console-scrollbar mine-topbar__nav flex-1 overflow-x-auto"
            >
              {rightNavGroups.map(renderNavGroup)}
            </nav>
            <div className="hidden shrink-0 items-center gap-1.5 2xl:flex">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-cyan-300/22 bg-cyan-300/8 text-muted shadow-soft transition hover:border-[var(--mine-border-strong)] hover:text-primary hover:shadow-glow" aria-label="告警入口">
                <Bell size={17} />
              </button>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-cyan-300/22 bg-cyan-300/8 text-muted shadow-soft transition hover:border-[var(--mine-border-strong)] hover:text-primary hover:shadow-glow" aria-label="用户入口">
                <UserRound size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
