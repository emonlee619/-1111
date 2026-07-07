import Link from "next/link";
import {
  getNavigationHref,
  getVisibleNavigationItems,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";
import type { ModuleTabItem } from "@/types/cockpit";
import type { NavigationGroup } from "@/types/navigation";

type ModuleTabsProps = {
  group?: NavigationGroup;
  items?: ModuleTabItem[];
  activeItem?: ModuleTabItem;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
};

const dynamicTemplatePattern = /\[[^\]]+\]/;

function resolveItems(group?: NavigationGroup, items?: ModuleTabItem[]) {
  const source = items ?? (group ? getVisibleNavigationItems(group) : []);
  return source.filter((item) => !item.isHidden && !dynamicTemplatePattern.test(getNavigationHref(item)));
}

export function ModuleTabs({ group, items, activeItem, ariaLabel, className, itemClassName }: ModuleTabsProps) {
  const visibleItems = resolveItems(group, items);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn("console-scrollbar flex min-w-0 max-w-full snap-x items-center gap-2 overflow-x-auto pb-1", className)}
    >
      {visibleItems.map((item) => {
        const active = activeItem?.title === item.title && activeItem.href === item.href;

        return (
          <Link
            key={`${item.title}-${item.href}`}
            href={getNavigationHref(item)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-10 shrink-0 snap-start whitespace-nowrap rounded-pill border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-[var(--mine-border-strong)] bg-primary-soft text-ink shadow-glow"
                : "border-line bg-surface text-muted hover:border-[var(--mine-border-strong)] hover:bg-primary-soft hover:text-ink",
              itemClassName,
            )}
          >
            {cleanDisplayCopy(item.title)}
          </Link>
        );
      })}
    </nav>
  );
}
