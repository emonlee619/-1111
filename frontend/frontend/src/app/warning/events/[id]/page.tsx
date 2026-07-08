import { PageScaffold } from "@/components/pages/PageScaffold";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageScaffold routePath="/warning/events/[id]" routeParams={{ id }} />;
}
