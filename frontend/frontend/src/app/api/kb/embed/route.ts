import { NextRequest } from "next/server";
import { kbJson } from "@/lib/kb/supabaseServer";
import { embedQuery } from "@/lib/kb/embed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 把用户问题转为 384 维 query embedding。
 * 不依赖 DeepSeek / HuggingFace；复用本地 TF-IDF+SVD pkl。
 * 不可用时返回 mode=fallback_keyword，绝不抛错。
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return kbJson({
      data: { mode: "fallback_keyword", dims: null, embedding: null, warnings: ["q 为空。"] },
      mode: "degraded",
      warnings: ["q 为空，无法生成 embedding。"],
    });
  }
  try {
    const data = await embedQuery(q);
    return kbJson({ data, mode: data.mode === "semantic" ? "online" : "degraded", warnings: data.warnings });
  } catch (error) {
    return kbJson(
      {
        data: {
          mode: "fallback_keyword",
          dims: null,
          embedding: null,
          warnings: [`embedding 异常：${error instanceof Error ? error.message : String(error)}`],
        },
        mode: "degraded",
        warnings: ["embedding 异常，已降级。"],
      },
      200,
    );
  }
}
