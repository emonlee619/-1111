import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_BASE_URL = `http://${"127.0.0.1"}:${"8001"}`;

const UNAVAILABLE_RESPONSE = {
  success: false,
  message: "知识库服务暂不可用，请确认 FastAPI 后端是否已启动。",
} as const;

type RouteContext = { params: Promise<{ path: string[] }> };

function resolveBaseUrl(): string {
  const fromEnv = process.env.KNOWLEDGE_API_BASE_URL;
  return fromEnv && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_BASE_URL;
}

function buildTargetUrl(req: NextRequest, pathSegments: string[]): string {
  const base = resolveBaseUrl().replace(/\/+$/, "");
  const path = pathSegments.map(encodeURIComponent).join("/");
  const search = req.nextUrl.search ?? "";
  return `${base}/api/${path}${search}`;
}

async function forward(req: NextRequest, pathSegments: string[]): Promise<Response> {
  if (pathSegments.length === 0) {
    return Response.json({ success: false, message: "缺少知识库 API 路径。" }, { status: 400 });
  }

  const targetUrl = buildTargetUrl(req, pathSegments);
  const method = req.method.toUpperCase();

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("accept", req.headers.get("accept") ?? "application/json");

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await req.text();
    if (body.length > 0) {
      init.body = body;
    }
  }

  const upstream = await fetch(targetUrl, init);

  const respHeaders = new Headers();
  respHeaders.set("cache-control", "no-store");
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    respHeaders.set("content-type", upstreamContentType);
  }

  const bodyBuffer = await upstream.arrayBuffer();
  return new Response(bodyBuffer, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

async function handle(req: NextRequest, ctx: RouteContext): Promise<Response> {
  try {
    const { path } = await ctx.params;
    return await forward(req, path ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[knowledge proxy] forward failed:", message);
    return Response.json(
      { ...UNAVAILABLE_RESPONSE, detail: message },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}
