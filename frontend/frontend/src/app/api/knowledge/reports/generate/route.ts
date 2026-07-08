import { errorJson, json } from "../../_shared";
import { generateKnowledgeReport } from "@/lib/knowledge/reportGenerator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { report_type?: string; title?: string; topic?: string };
    const data = await generateKnowledgeReport({
      report_type: body.report_type || "warning_report",
      title: body.title,
      topic: body.topic,
    });
    return json({ data });
  } catch (error) {
    return errorJson(error);
  }
}
