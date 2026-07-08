import { resolveKbMode, kbJson } from "@/lib/kb/supabaseServer";
import { buildSummary } from "@/lib/kb/summary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { mode, warnings } = await resolveKbMode();
  try {
    const data = await buildSummary(mode, warnings);
    return kbJson({ data, mode: data.mode, warnings: data.warnings });
  } catch (error) {
    return kbJson(
      { error: error instanceof Error ? error.message : String(error), mode, warnings },
      503,
    );
  }
}
