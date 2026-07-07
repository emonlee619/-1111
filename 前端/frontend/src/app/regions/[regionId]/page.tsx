import { PageScaffold } from "@/components/pages/PageScaffold";

export default async function Page({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params;
  return <PageScaffold routePath="/regions/[regionId]" routeParams={{ regionId }} />;
}
