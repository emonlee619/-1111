/**
 * 服务端 Supabase REST 客户端（Stage 3 知识中枢专用）
 *
 * 安全约束：
 * - 本文件只能在 Next.js Route Handler / Server Component 等服务端上下文中使用。
 * - 严禁在 "use client" 组件中 import 本模块，否则 service role key 会泄漏到浏览器。
 * - service role key 从 process.env.SUPABASE_SERVICE_ROLE_KEY 读取，浏览器无此变量。
 * - 浏览器组件一律通过 /api/kb/* 间接访问数据。
 */

import type { KbApiMode } from "@/types/kb";

type SupabaseConfig = { url: string; key: string };

/** 读取服务端 Supabase 配置。无配置返回 null（调用方据此进入 offline 降级）。 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // 优先 service role（服务端全量读）；缺失时退回 anon（仅 RLS 可读部分）。
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** 是否配置了 service role key（决定能否读 RLS 受限表）。 */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 通用 Supabase REST 请求。失败抛错，调用方捕获后转 warnings。
 * 表名为空时返回空数组。
 */
export async function kbRest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 环境变量未配置（需要 SUPABASE_URL 与服务端 key）。");
  }
  const headers = new Headers(init?.headers);
  headers.set("apikey", config.key);
  headers.set("authorization", `Bearer ${config.key}`);
  headers.set("accept", "application/json");
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ([] as unknown as T);
}

/** 调用 Supabase RPC（PostgreSQL function）。 */
export async function kbRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 环境变量未配置，无法调用 RPC。");
  }
  const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase RPC ${fn} ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ([] as unknown as T);
}

/** 取表行数（用 Prefer: count=exact 头解析，避免拉全表）。 */
export async function kbCount(table: string): Promise<number> {
  const config = getSupabaseConfig();
  if (!config) return 0;
  const response = await fetch(`${config.url}/rest/v1/${table}?select=id&limit=1`, {
    method: "GET",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: "application/json",
      prefer: "count=exact",
    },
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const range = response.headers.get("content-range"); // 形如 "0-0/123"
  if (!range) return 0;
  const total = range.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 探测 Supabase 可达性，返回运行模式。
 * - offline: 未配置 env 或网络不可达
 * - degraded: 可达但缺少 service role（语义检索受限）
 * - online: 配置齐全且可达
 */
export async function resolveKbMode(): Promise<{ mode: KbApiMode; warnings: string[] }> {
  const config = getSupabaseConfig();
  const warnings: string[] = [];
  if (!config) {
    return {
      mode: "offline",
      warnings: ["SUPABASE_URL 或服务端 key 未配置，知识中枢运行于离线降级模式。"],
    };
  }
  try {
    // 用最小请求探活
    await kbRest<unknown[]>("source_documents?select=id&limit=1");
  } catch (error) {
    return {
      mode: "offline",
      warnings: [
        `Supabase 不可达：${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  if (!hasServiceRole()) {
    warnings.push("未配置 SUPABASE_SERVICE_ROLE_KEY，部分受 RLS 保护的表可能读不全。");
    return { mode: "degraded", warnings };
  }
  return { mode: "online", warnings };
}

/** 统一 JSON 响应工具。 */
export function kbJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
