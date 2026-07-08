import { NextRequest } from "next/server";
import { resolveKbMode, kbJson, kbRest, getSupabaseConfig } from "@/lib/kb/supabaseServer";
import { searchKb } from "@/lib/kb/search";
import { listAllCardsLite } from "@/lib/kb/queries";
import type { KbSearchRequest, KbKnowledgeCard } from "@/types/kb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitize(q: string): string {
  return q.replace(/[,:*%_\\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * 兼容策略：
 * - 带 mode 参数（新客户端）→ 返回 KbSearchResponse（语义/关键词/混合）。
 * - 不带 mode 参数（旧 knowledgeApi.fetchIndicators）→ 返回 KbCard[] lite，保持旧契约。
 */
export async function GET(req: NextRequest) {
  const { mode, warnings } = await resolveKbMode();
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  const modeParam = params.get("mode");

  // 旧契约兼容：无 mode → KbCard[]
  if (!modeParam) {
    if (mode === "offline") return kbJson({ data: [], mode, warnings, total: 0 });
    try {
      const limit = Math.min(Number(params.get("limit") ?? 50), 200);
      const safe = sanitize(q);
      if (!safe) {
        const data = await listAllCardsLite();
        return kbJson({ data: data.slice(0, limit), mode, warnings, total: data.length });
      }
      const config = getSupabaseConfig();
      if (!config) return kbJson({ data: [], mode, warnings, total: 0 });
      const orParts = ["title", "summary", "full_content"]
        .map((f) => `${f}.ilike.*${encodeURIComponent(safe)}*`)
        .join(",");
      const path = `knowledge_cards?select=id,card_code,title,category,source_type,summary,related_channels,model_boundary,risk_level&status=eq.published&or=(${orParts})&limit=${limit}`;
      const data = await kbRest<KbKnowledgeCard[]>(path);
      return kbJson({ data, mode, warnings, total: data.length });
    } catch (error) {
      return kbJson(
        { error: error instanceof Error ? error.message : String(error), data: [], mode, warnings, total: 0 },
        503,
      );
    }
  }

  // 新契约：KbSearchResponse
  try {
    const reqBody: KbSearchRequest = {
      q,
      mode: modeParam as KbSearchRequest["mode"],
      category: params.get("category") ?? undefined,
      sourceType: params.get("sourceType") ?? undefined,
      targetType: params.get("targetType") ?? undefined,
      relatedChannel: params.get("relatedChannel") ?? undefined,
      reviewStatus: params.get("reviewStatus") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : undefined,
      offset: params.get("offset") ? Number(params.get("offset")) : undefined,
    };
    const data = await searchKb(reqBody, mode);
    return kbJson({ data, mode: data.mode, warnings: data.warnings, total: data.total });
  } catch (error) {
    return kbJson(
      { error: error instanceof Error ? error.message : String(error), mode, warnings },
      503,
    );
  }
}
