import { RiskCardDetail } from "@/components/double-prevention/Panels";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RiskCardDetail id={id} />;
}
