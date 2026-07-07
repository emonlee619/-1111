import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { KeyValueList } from "@/components/ui/BusinessSections";
import type { DatasetVersion } from "@/types/business";

export function DatasetVersionCard({ version }: { version: DatasetVersion }) {
  return (
    <ConsoleCard title="数据集版本摘要" description="展示 mock 数据集版本，不提供真实下载或上传入口。">
      <KeyValueList
        items={[
          { label: "版本", value: version.version },
          { label: "时间范围", value: version.timeRange },
          { label: "样本数", value: version.sampleCount },
          { label: "通道覆盖", value: version.channelCoverage },
          { label: "质量评分", value: version.qualityScore },
          { label: "关联模型", value: version.relatedModel },
        ]}
      />
      <p className="mt-4 text-sm leading-6 text-muted">{version.note}</p>
    </ConsoleCard>
  );
}
