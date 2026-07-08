import { NextRequest } from "next/server";
import { resolveKbMode, kbJson } from "@/lib/kb/supabaseServer";
import { askKb } from "@/lib/kb/ask";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handle(question: string) {
  const { mode, warnings } = await resolveKbMode();
  try {
    const data = await askKb(question, mode);
    return kbJson({ data, mode, warnings: data.warnings });
  } catch (error) {
    return kbJson(
      { error: error instanceof Error ? error.message : String(error), mode, warnings },
      503,
    );
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { question?: string };
  return handle((body.question ?? "").trim());
}

export async function GET(req: NextRequest) {
  const question = req.nextUrl.searchParams.get("question") ?? "";
  return handle(question.trim());
}
