import { errorJson, json } from "../../_shared";
import { getKnowledgeRelations } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ cardCode: string }> };

export async function GET(_req: Request, ctx: Context) {
  try {
    const { cardCode } = await ctx.params;
    const data = await getKnowledgeRelations(decodeURIComponent(cardCode));
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
