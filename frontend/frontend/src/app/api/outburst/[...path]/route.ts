import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_BASE_HOST = ["127", "0", "0", "1"].join(".");
const DEFAULT_BASE_PORT = "8001";
const DEFAULT_BASE_URL = `http://${DEFAULT_BASE_HOST}:${DEFAULT_BASE_PORT}`;

const UNAVAILABLE_RESPONSE = {
  success: false,
  message: "预警模型服务暂不可用，请确认 gas-outburst-api FastAPI 后端是否已启动。",
} as const;

type RouteContext = { params: Promise<{ path: string[] }> };
type JsonRecord = Record<string, unknown>;
type UpstreamWarning = JsonRecord & {
  id?: number | string;
  event_id?: string;
  timestamp?: string;
  mine_id?: string;
  dynamic_risk?: number;
  static_risk?: number;
  combined_risk?: number;
  risk_level?: string;
  risk_level_code?: string | number;
  heatmap_data?: unknown;
  sensor_contribution?: unknown;
};

const READ_ONLY_PATHS = new Set([
  "health",
  "stats",
  "sensors",
  "sensors/latest",
  "sensor-data",
  "sensor-data/recent",
  "sensor-data/series",
  "static-data",
  "meta",
  "warnings",
  "warnings/latest",
  "events/ledger",
  "config",
]);

const CONTROLLED_POST_PATHS = new Set([
  "static-risk",
  "predict",
  "predict-batch",
]);

function pathKey(pathSegments: string[]): string {
  return pathSegments.join("/");
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.OUTBURST_API_BASE_URL;
  return fromEnv && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_BASE_URL;
}

function buildTargetUrl(req: NextRequest, pathSegments: string[]): string {
  const base = resolveBaseUrl().replace(/\/+$/, "");
  const path = pathSegments.map(encodeURIComponent).join("/");
  const search = req.nextUrl.search ?? "";
  return `${base}/api/${path}${search}`;
}

function buildInternalUrl(path: string, search = ""): string {
  const base = resolveBaseUrl().replace(/\/+$/, "");
  const prefix = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api${prefix}${search}`;
}

function noStoreJson(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchUpstreamJson(path: string, search = ""): Promise<unknown> {
  const resp = await fetch(buildInternalUrl(path, search), {
    cache: "no-store",
    headers: { accept: "application/json" },
    redirect: "manual",
  });
  if (!resp.ok) {
    return { success: false, upstreamStatus: resp.status, detail: "上游预警服务返回错误。" };
  }
  return resp.json();
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function riskCodeFromWarning(warning: UpstreamWarning): "low" | "normal" | "high" | "critical" {
  const explicit = warning.risk_level_code;
  if (explicit === "low" || explicit === "normal" || explicit === "high" || explicit === "critical") return explicit;
  const numeric = typeof explicit === "number" ? explicit : Number.NaN;
  if (numeric >= 4) return "critical";
  if (numeric >= 3) return "high";
  if (numeric >= 2) return "normal";
  if (numeric >= 1) return "low";

  const score = typeof warning.combined_risk === "number" ? warning.combined_risk : 0;
  if (score >= 0.9) return "critical";
  if (score >= 0.7) return "high";
  if (score >= 0.3) return "normal";
  return "low";
}

function normalizeContribution(value: unknown): Array<{ sensor_id: string; contribution: number; rank: number }> {
  return parseJsonArray(value).map((item, index) => {
    if (isRecord(item)) {
      return {
        sensor_id: String(item.sensor_id ?? item.id ?? item.name ?? `S${String(index + 1).padStart(2, "0")}`),
        contribution: Number(item.contribution ?? item.weight ?? item.value ?? 0),
        rank: Number(item.rank ?? index + 1),
      };
    }
    return {
      sensor_id: `S${String(index + 1).padStart(2, "0")}`,
      contribution: Number(item ?? 0),
      rank: index + 1,
    };
  });
}

function normalizeWarning(raw: unknown): UpstreamWarning {
  const warning = isRecord(raw) ? raw as UpstreamWarning : {};
  const id = warning.id ?? warning.event_id ?? warning.timestamp ?? "latest";
  const eventId = warning.event_id ?? (warning.id === undefined ? String(id) : `WRN-${String(warning.id)}`);
  const heatmap = parseJsonArray(warning.heatmap_data);
  const contribution = normalizeContribution(warning.sensor_contribution);

  return {
    ...warning,
    id: typeof warning.id === "number" ? warning.id : Number.parseInt(String(warning.id ?? 0), 10) || 0,
    event_id: eventId,
    timestamp: warning.timestamp ?? "",
    mine_id: warning.mine_id ?? "M001",
    dynamic_risk: Number(warning.dynamic_risk ?? 0),
    static_risk: Number(warning.static_risk ?? 0),
    combined_risk: Number(warning.combined_risk ?? 0),
    risk_level: warning.risk_level ?? "未分级",
    risk_level_code: riskCodeFromWarning(warning),
    heatmap_data: heatmap,
    sensor_contribution: contribution,
    event_status: warning.event_status ?? "pending",
    confirm_status: warning.confirm_status ?? "待确认",
    summary: warning.summary ?? `模型在 ${warning.timestamp ?? "最新时刻"} 生成预警结果。`,
    disposal_records: Array.isArray(warning.disposal_records) ? warning.disposal_records : [],
    advice: Array.isArray(warning.advice) ? warning.advice : [],
    tracing_entry: warning.tracing_entry ?? `/source-tracing/events/${eventId}`,
  };
}

function extractWarnings(body: unknown): unknown[] {
  if (!isRecord(body)) return [];
  const warnings = body.warnings;
  return Array.isArray(warnings) ? warnings : [];
}

function isAllowedWarningRead(pathSegments: string[]): boolean {
  if (pathSegments[0] !== "warnings") return false;
  if (pathSegments.length === 1) return true;
  if (pathSegments.length === 2) return pathSegments[1] === "latest" || pathSegments[1].length > 0;
  return pathSegments.length === 3 && pathSegments[1].length > 0 && pathSegments[2] === "contribution";
}

async function adaptWarnings(req: NextRequest): Promise<Response> {
  const body = await fetchUpstreamJson("/warnings", req.nextUrl.search ?? "");
  const warnings = extractWarnings(body).map(normalizeWarning);
  return noStoreJson({ warnings, count: warnings.length });
}

async function adaptLatestWarning(): Promise<Response> {
  const body = await fetchUpstreamJson("/warnings/latest");
  if (isRecord(body) && body.success === false) {
    if (body.upstreamStatus === 404) {
      return noStoreJson({
        id: 0,
        event_id: "NO-LATEST",
        timestamp: new Date().toISOString(),
        mine_id: "M001",
        dynamic_risk: 0,
        static_risk: 0,
        combined_risk: 0,
        risk_level: "未分级",
        risk_level_code: "low",
        sensor_contribution: [],
        heatmap_data: [],
        event_status: "empty",
        confirm_status: "无数据",
        summary: "暂无预警记录",
        disposal_records: [],
        advice: [],
        tracing_entry: "",
      });
    }
    return noStoreJson(body, { status: Number(body.upstreamStatus) || 500 });
  }
  return noStoreJson(normalizeWarning(body));
}

async function adaptWarningDetail(id: string): Promise<Response> {
  const body = await fetchUpstreamJson("/warnings", "?limit=1000");
  const warnings = extractWarnings(body).map(normalizeWarning);
  const match = warnings.find((warning) => (
    warning.event_id === id ||
    String(warning.id) === id ||
    (warning.id !== undefined && `WRN-${String(warning.id)}` === id)
  ));
  if (!match) {
    return noStoreJson({ success: false, detail: `预警事件 ${id} 未找到` }, { status: 404 });
  }
  return noStoreJson(match);
}

async function adaptWarningContribution(id: string): Promise<Response> {
  const detail = await adaptWarningDetail(id);
  if (!detail.ok) return detail;
  const warning = await detail.json() as UpstreamWarning;
  return noStoreJson({
    event_id: warning.event_id,
    sensor_contribution: warning.sensor_contribution ?? [],
    heatmap_data: warning.heatmap_data ?? [],
  });
}

async function adaptEventLedger(req: NextRequest): Promise<Response> {
  const body = await fetchUpstreamJson("/warnings", req.nextUrl.search ?? "");
  const events = extractWarnings(body).map(normalizeWarning);
  return noStoreJson({ events, count: events.length });
}

function normalizeSensorId(sensorId: string): string {
  if (sensorId.startsWith("B") && sensorId.length === 2) {
    return "B0" + sensorId[1];
  }
  return sensorId;
}

async function adaptLatestSensors(): Promise<Response> {
  const body = await fetchUpstreamJson("/sensors/latest");
  const sensors = isRecord(body) && Array.isArray(body.sensors) ? body.sensors.filter(isRecord) : [];
  
  const normalized = sensors.map((item) => ({
    ...item,
    sensor_id: normalizeSensorId(String(item.sensor_id ?? "")),
  }));
  
  return noStoreJson({ sensors: normalized, count: normalized.length, source: "sensors/latest" });
}

async function adaptMeta(): Promise<Response> {
  const body = await fetchUpstreamJson("/meta");
  const meta = isRecord(body) && Array.isArray(body.meta) ? body.meta.filter(isRecord) : [];
  
  const normalized = meta.map((item) => ({
    ...item,
    sensor_id: normalizeSensorId(String(item.sensor_id ?? "")),
  }));
  
  return noStoreJson({ sensors: normalized, count: normalized.length, source: "meta" });
}

async function adaptConfig(): Promise<Response> {
  const body = await fetchUpstreamJson("/config");
  const configs = isRecord(body) && Array.isArray(body.configs) ? body.configs.filter(isRecord) : [];
  return noStoreJson({ config: configs, count: configs.length, source: "config" });
}

async function adaptSensorSeries(req: NextRequest): Promise<Response> {
  const params = req.nextUrl.searchParams;
  const limit = params.get("limit") ?? "240";
  const upstreamParams = new URLSearchParams();
  upstreamParams.set("limit", limit);
  const sensorId = params.get("sensor_id");
  if (sensorId) upstreamParams.set("sensor_id", sensorId);

  const body = await fetchUpstreamJson("/sensor-data", `?${upstreamParams.toString()}`);
  const rows = isRecord(body) && Array.isArray(body.data) ? body.data.filter(isRecord) : [];
  const grouped = new Map<string, JsonRecord[]>();

  for (const row of rows) {
    const key = String(sensorId ? row.timestamp ?? "" : row.timestamp ?? row.sensor_id ?? "");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(row);
  }

  const data = Array.from(grouped.entries()).map(([bucketTime, bucketRows]) => {
    const values = bucketRows.map((row) => Number(row.value)).filter(Number.isFinite);
    const avg = values.reduce((sum, item) => sum + item, 0) / Math.max(values.length, 1);
    return {
      sensor_id: sensorId ?? String(bucketRows[0]?.sensor_id ?? "all"),
      sensor_type: String(bucketRows[0]?.sensor_type ?? ""),
      bucket_time: bucketTime,
      avg_value: avg,
      min_value: values.length ? Math.min(...values) : 0,
      max_value: values.length ? Math.max(...values) : 0,
      sample_count: values.length,
    };
  });

  return noStoreJson({ data, count: data.length, bucket_minutes: Number(params.get("bucket_minutes") ?? 1) });
}

async function adaptReadOnly(req: NextRequest, pathSegments: string[]): Promise<Response | undefined> {
  const key = pathKey(pathSegments);
  if (key === "sensors/latest") return adaptLatestSensors();
  if (key === "meta") return adaptMeta();
  if (key === "config") return adaptConfig();
  if (key === "sensor-data/series") return adaptSensorSeries(req);
  if (key === "warnings") return adaptWarnings(req);
  if (key === "warnings/latest") return adaptLatestWarning();
  if (pathSegments[0] === "warnings" && pathSegments[1] && pathSegments[2] === "contribution") return adaptWarningContribution(pathSegments[1]);
  if (pathSegments[0] === "warnings" && pathSegments[1]) return adaptWarningDetail(pathSegments[1]);
  if (key === "events/ledger") return adaptEventLedger(req);
  return undefined;
}

async function forward(req: NextRequest, pathSegments: string[]): Promise<Response> {
  if (pathSegments.length === 0) {
    return noStoreJson({ success: false, message: "缺少预警模型 API 路径。" }, { status: 400 });
  }

  const method = req.method.toUpperCase();
  const key = pathKey(pathSegments);
  const writeBlocked = method === "PUT" || method === "DELETE" || method === "PATCH" || key.startsWith("auto-predict");
  const allowedRead = method === "GET" && (READ_ONLY_PATHS.has(key) || isAllowedWarningRead(pathSegments));
  const allowedPost = method === "POST" && CONTROLLED_POST_PATHS.has(key);

  if (writeBlocked || (!allowedRead && !allowedPost)) {
    return noStoreJson(
      { success: false, message: "该预警后端接口未通过前端代理开放。", path: key, method },
      { status: 403 },
    );
  }

  if (method === "GET") {
    const adapted = await adaptReadOnly(req, pathSegments);
    if (adapted) return adapted;
  }

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", req.headers.get("accept") ?? "application/json");

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (method === "POST") {
    const body = await req.text();
    if (body.length > 0) init.body = body;
  }

  const upstream = await fetch(buildTargetUrl(req, pathSegments), init);
  const respHeaders = new Headers();
  respHeaders.set("cache-control", "no-store");
  respHeaders.set("content-type", "application/json");

  const rawText = await upstream.text();
  let body: unknown = { success: upstream.ok, status: upstream.status };
  if (rawText.trim().length > 0) {
    try {
      body = JSON.parse(rawText) as unknown;
    } catch {
      body = upstream.ok
        ? { success: true, detail: rawText.slice(0, 500) }
        : { success: false, detail: "上游预警服务返回非 JSON 错误。" };
    }
  }

  return new Response(JSON.stringify(body), {
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
    console.error("[outburst proxy] forward failed:", message);
    return noStoreJson(
      { ...UNAVAILABLE_RESPONSE, detail: "代理无法连接预警模型服务。" },
      { status: 503 },
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

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  return handle(req, ctx);
}
