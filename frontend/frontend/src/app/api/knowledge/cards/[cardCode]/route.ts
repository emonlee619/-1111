import { errorJson, json } from "../../_shared";
import { getKnowledgeCard } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ cardCode: string }> };

export async function GET(_req: Request, ctx: Context) {
  try {
    const { cardCode } = await ctx.params;
    const data = await getKnowledgeCard(decodeURIComponent(cardCode));
    return data ? json({ data }) : json({ error: "knowledge_card_not_found" }, 404);
  } catch (error) {
    return errorJson(error);
  }
}
