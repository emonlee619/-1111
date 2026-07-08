import { errorJson, json } from "../../_shared";
import { getKnowledgeStats, listReviewItems } from "@/lib/knowledge/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [stats, review] = await Promise.all([getKnowledgeStats(), listReviewItems()]);
    return json({ data: { stats, review } });
  } catch (error) {
    return errorJson(error);
  }
}
