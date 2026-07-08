import { errorJson, json, numberParam } from "../_shared";
import { searchKnowledgeCards } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = await searchKnowledgeCards({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      source_type: url.searchParams.get("source_type") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      risk: url.searchParams.get("risk") ?? undefined,
      limit: numberParam(url.searchParams.get("limit"), 30),
    });
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
