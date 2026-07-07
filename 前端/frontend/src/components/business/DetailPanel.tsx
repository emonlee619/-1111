import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyValueList, TimelineList } from "@/components/ui/BusinessSections";
import type { KeyValueItem, TimelineItem } from "@/types/business";

export function DetailPanel({
  title,
  description,
  items,
  timeline,
}: {
  title: string;
  description?: string;
  items?: KeyValueItem[];
  timeline?: TimelineItem[];
}) {
  if (!items?.length && !timeline?.length) {
    return <EmptyState title="未找到详情" description="请选择列表中的 mock 记录，或确认当前 id 是否存在。" />;
  }

  return (
    <ConsoleCard title={title} description={description}>
      {items?.length ? <KeyValueList items={items} /> : null}
      {timeline?.length ? <div className="mt-4"><TimelineList items={timeline} /></div> : null}
    </ConsoleCard>
  );
}
