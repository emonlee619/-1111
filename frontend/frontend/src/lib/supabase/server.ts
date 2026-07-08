type RestOptions = RequestInit & {
  useServiceRole?: boolean;
};

function env(name: string) {
  return process.env[name]?.trim();
}

export function getSupabaseServerConfig(useServiceRole = false) {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = useServiceRole
    ? env("SUPABASE_SERVICE_ROLE_KEY")
    : env("SUPABASE_ANON_KEY") ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !key) {
    throw new Error(
      useServiceRole
        ? "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
        : "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url: url.replace(/\/+$/, ""), key };
}

export async function supabaseRest<T>(path: string, init: RestOptions = {}): Promise<T> {
  const { useServiceRole = false, ...requestInit } = init;
  const config = getSupabaseServerConfig(useServiceRole);
  const headers = new Headers(requestInit.headers);

  headers.set("apikey", config.key);
  headers.set("authorization", `Bearer ${config.key}`);
  headers.set("accept", "application/json");
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...requestInit,
    headers,
    cache: "no-store",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${text}`);
  }

  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function supabaseRpc<T>(fn: string, body: unknown, useServiceRole = true): Promise<T> {
  const config = getSupabaseServerConfig(useServiceRole);
  const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase RPC ${response.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : ([] as T);
}
