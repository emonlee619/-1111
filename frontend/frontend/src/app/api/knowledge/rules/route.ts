import { errorJson, json, numberParam } from "../_shared";
import { listKnowledgeRules } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = await listKnowledgeRules({
      channel: url.searchParams.get("channel") ?? undefined,
      rule_type: url.searchParams.get("rule_type") ?? undefined,
      limit: numberParam(url.searchParams.get("limit"), 80),
    });
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
