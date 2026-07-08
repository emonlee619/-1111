import { resolveKbMode, kbJson } from "@/lib/kb/supabaseServer";
import { buildCoverage } from "@/lib/kb/coverage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { mode, warnings } = await resolveKbMode();
  if (mode === "offline") {
    return kbJson({ data: null, mode, warnings: [...warnings, "Supabase 离线，覆盖率不可用。"] });
  }
  try {
    const data = await buildCoverage(mode);
    return kbJson({ data, mode: data.mode, warnings: data.warnings });
  } catch (error) {
    return kbJson(
      { error: error instanceof Error ? error.message : String(error), mode, warnings },
      503,
    );
  }
}
