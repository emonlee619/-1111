import { KnowledgeStage3Client } from "@/components/knowledge/KnowledgeStage3Client";

type Props = { params: Promise<{ cardCode: string }> };

export default async function KnowledgeCardPage({ params }: Props) {
  const { cardCode } = await params;
  return <KnowledgeStage3Client mode="card" cardCode={decodeURIComponent(cardCode)} />;
}
