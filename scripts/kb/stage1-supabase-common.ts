type Json = Record<string, unknown>;

export type SupabaseEnv = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const env = getSupabaseEnv();
  const headers = new Headers(init.headers);
  headers.set("apikey", env.serviceRoleKey);
  headers.set("authorization", `Bearer ${env.serviceRoleKey}`);
  headers.set("content-type", headers.get("content-type") ?? "application/json");
  headers.set("accept", "application/json");

  const response = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export function chunkText(content: string, size = 1200): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let cursor = 0; cursor < normalized.length; cursor += size) {
    chunks.push(normalized.slice(cursor, cursor + size));
  }
  return chunks;
}

export function stableCardCode(prefix: string, value: string) {
  return `${prefix}-${Buffer.from(value).toString("hex").slice(0, 12).toUpperCase()}`;
}

export function assertSafeChannelBoundary(card: Json) {
  if (card.source_type !== "physics_constrained") return;
  const boundary = String(card.model_boundary ?? card.human_review_policy ?? "");
  if (!boundary) {
    throw new Error(`physics_constrained card lacks boundary: ${String(card.card_code ?? card.title)}`);
  }
}
