import { errorJson, json, numberParam } from "../_shared";
import { getKnowledgeGraph } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = await getKnowledgeGraph(numberParam(url.searchParams.get("limit"), 80));
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
