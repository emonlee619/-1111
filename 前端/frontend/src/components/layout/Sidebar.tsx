"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  BrainCircuit,
  Database,
  Gauge,
  GitBranch,
  Settings,
  ShieldAlert,
} from "lucide-react";
import {
  findActiveNavigationItem,
  getNavigationHref,
  getVisibleNavigationItems,
  matchesNavigationGroup,
  navigation,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import type { NavigationItem } from "@/types/navigation";

const icons = {
  Gauge,
  Activity,
  GitBranch,
  ShieldAlert,
  Boxes,
  BrainCircuit,
  Database,
  Settings,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="console-scrollbar h-[calc(100vh-96px)] overflow-y-auto rounded-card border border-line bg-card p-3 shadow-card backdrop-blur-2xl">
      <nav className="space-y-3">
        {navigation.filter((group) => group.visibleInSidebar !== false).map((group) => {
          const Icon = icons[group.icon as keyof typeof icons] ?? Gauge;
          const activeItem = findActiveNavigationItem(pathname, group);
          const sidebarItems = getVisibleNavigationItems(group)
            .map((item) => ({ item, href: getNavigationHref(item) }))
            .filter((entry): entry is { item: NavigationItem; href: string } => Boolean(entry.href));
          const groupHref = group.href ?? sidebarItems[0]?.href ?? "/";
          const groupActive = matchesNavigationGroup(pathname, group);

          return (
            <div key={group.title} className="rounded-[16px] border border-line bg-surface p-2">
              <Link
                href={groupHref}
                onClick={onNavigate}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition hover:bg-primary-soft hover:shadow-soft",
                  groupActive ? "border border-[var(--mine-border-strong)] bg-primary-soft text-primary shadow-glow" : "border border-transparent text-ink",
                )}
              >
                <Icon size={17} className="shrink-0" />
                <span className="min-w-0 break-words">{group.title}</span>
              </Link>
              <div className="space-y-1">
                {sidebarItems.map(({ item, href }) => {
                  const active = activeItem?.title === item.title && activeItem.href === item.href;
                  return (
                    <Link
                      key={`${item.title}-${item.href}`}
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-control px-3 py-2 text-sm leading-5 transition",
                        active
                          ? "bg-primary-soft font-medium text-ink ring-1 ring-[var(--mine-border-strong)]"
                          : "text-muted hover:bg-primary-soft hover:text-ink",
                      )}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
