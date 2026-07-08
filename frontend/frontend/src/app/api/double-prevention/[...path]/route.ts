import { NextRequest } from "next/server";
import { resolveDoublePreventionApi } from "@/data/doublePreventionApi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const { path } = await ctx.params;
    const result = resolveDoublePreventionApi(path ?? []);
    return Response.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[double-prevention proxy] handle failed:", err);
    return Response.json({ ok: false, message: "双预防服务暂不可用" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}