import { NextRequest } from "next/server";
import { resolveKbMode, kbJson } from "@/lib/kb/supabaseServer";
import { listKnowledgeCards } from "@/lib/kb/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { mode, warnings } = await resolveKbMode();
  if (mode === "offline") return kbJson({ data: [], mode, warnings, total: 0 });
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);
    const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
    const data = await listKnowledgeCards(Math.min(limit, 500), Math.max(offset, 0));
    return kbJson({ data, mode, warnings, total: data.length });
  } catch (error) {
    return kbJson(
      { error: error instanceof Error ? error.message : String(error), data: [], mode, warnings, total: 0 },
      503,
    );
  }
}
