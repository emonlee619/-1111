import { NextRequest } from "next/server";
import { answerWithEvidence, listKbCards, listKbRules, listKbTemplates, searchKbCards } from "@/lib/kbSupabaseRest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ path: string[] }> };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    const resource = path?.[0] ?? "summary";
    if (resource === "cards") return json({ data: await listKbCards() });
    if (resource === "rules") return json({ data: await listKbRules() });
    if (resource === "templates") return json({ data: await listKbTemplates() });
    if (resource === "search") return json({ data: await searchKbCards(req.nextUrl.searchParams.get("q") ?? "") });
    if (resource === "summary") {
      const [cards, rules, templates] = await Promise.all([listKbCards(), listKbRules(), listKbTemplates()]);
      return json({
        data: {
          cards,
          rules,
          templates,
          counts: {
            published_cards: cards.length,
            published_rules: rules.length,
            published_templates: templates.length,
            real_sensor_cards: cards.filter((card) => card.source_type === "real_sensor").length,
            physics_constrained_cards: cards.filter((card) => card.source_type === "physics_constrained").length
          }
        }
      });
    }
    return json({ error: "unknown_kb_resource" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 503);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    if (path?.[0] !== "ask") return json({ error: "unknown_kb_action" }, 404);
    const body = (await req.json()) as { question?: string };
    return json({ data: await answerWithEvidence(body.question ?? "") });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 503);
  }
}
