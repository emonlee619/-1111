"use client";

import { usePathname } from "next/navigation";
import { ModuleTabs } from "@/components/cockpit/ModuleTabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  findActiveNavigationItem,
  findNavigationGroup,
} from "@/config/navigation";
import { cleanDisplayCopy } from "@/utils/displayText";

type PageHeaderProps = {
  title: string;
  module: string;
  description: string;
  status: string;
};

export function PageHeader({ title, module, description, status }: PageHeaderProps) {
  const pathname = usePathname();
  const navigationGroup = findNavigationGroup(pathname);
  const activeItem = navigationGroup ? findActiveNavigationItem(pathname, navigationGroup) : undefined;
  const moduleTitle = cleanDisplayCopy(navigationGroup?.title ?? module);
  const moduleStatus = cleanDisplayCopy(navigationGroup?.status ?? status);
  const pageStatus = cleanDisplayCopy(status);

  return (
    <section className="mb-6 overflow-hidden rounded-card border border-line bg-card p-5 shadow-card backdrop-blur-2xl sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="mb-2 text-sm font-medium text-primary">{moduleTitle}</p>
          <h1 className="break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{cleanDisplayCopy(title)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{cleanDisplayCopy(description)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">mock 数据</StatusBadge>
          <StatusBadge tone="neutral">{moduleStatus}</StatusBadge>
          {moduleStatus !== pageStatus ? <StatusBadge tone="neutral">{pageStatus}</StatusBadge> : null}
        </div>
      </div>
      {pathname !== "/" && navigationGroup ? (
        <ModuleTabs
          group={navigationGroup}
          activeItem={activeItem}
          ariaLabel={`${moduleTitle}二级入口`}
          className="mt-5"
        />
      ) : null}
    </section>
  );
}
