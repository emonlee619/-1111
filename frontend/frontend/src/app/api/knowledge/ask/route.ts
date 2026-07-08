import { errorJson, json } from "../_shared";
import { answerWithRag } from "@/lib/knowledge/rag";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { question?: string };
    const data = await answerWithRag(body.question ?? "");
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
