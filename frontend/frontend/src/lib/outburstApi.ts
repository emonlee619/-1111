import type { RiskLevel } from "@/types/risk";
import type { TimelineItem } from "@/types/business";

export class OutburstApiError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "OutburstApiError";
  }
}

export type OutburstHealth = {
  status: string;
  database?: string;
  message?: string;
};

export type OutburstStats = {
  meta_count?: number;
  dynamic_sensor_count?: number;
  warning_count?: number;
  latest_dynamic_data?: string;
  latest_warning?: string;
  [key: string]: unknown;
};

export type OutburstSensorMeta = {
  sensor_id: string;
  indicator_name?: string;
  sensor_type?: string;
  indicator_type?: string;
  source_type?: string;
  spatial_position?: string;
  unit?: string;
  value?: number | null;
  timestamp?: string;
  threshold?: number;
  critical_threshold?: number;
  description?: string;
  [key: string]: unknown;
};

export type OutburstRawDataPoint = {
  id?: string | number;
  sensor_id?: string;
  sensor_type?: string;
  indicator_type?: string;
  source_type?: string;
  value?: number | null;
  unit?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type OutburstSeriesPoint = {
  sensor_id?: string;
  sensor_type?: string;
  bucket_time?: string;
  avg_value: number;
  min_value?: number;
  max_value?: number;
  sample_count?: number;
};

export type OutburstWarningContribution = {
  event_id?: string;
  sensor_contribution: Array<{ sensor_id: string; contribution: number; rank: number; source_type?: string; slot?: string }>;
  heatmap_data?: unknown[];
};

export type OutburstWarning = {
  id?: number;
  event_id: string;
  timestamp: string;
  mine_id: string;
  dynamic_risk: number;
  static_risk: number;
  combined_risk: number;
  risk_level: string;
  risk_level_code: RiskLevel;
  sensor_contribution?: OutburstWarningContribution["sensor_contribution"];
  heatmap_data?: unknown[];
  event_status?: string;
  confirm_status?: string;
  owner?: string;
  summary?: string;
  disposal_records?: TimelineItem[];
  advice?: string[];
  tracing_entry?: string;
  [key: string]: unknown;
};

export type OutburstStaticData = Record<string, unknown>;

export type OutburstConfig = {
  config_key: string;
  config_value: string;
  description?: string;
  updated_at?: string;
  [key: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/outburst/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: unknown = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { success: response.ok, detail: text };
    }
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload ? String((payload as { message?: unknown }).message) : `outburst ${response.status}`;
    throw new OutburstApiError(message, response.status);
  }
  return payload as T;
}

function unwrapArray<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload === "object" && payload !== null && Array.isArray((payload as Record<string, unknown>)[key])) {
    return (payload as Record<string, T[]>)[key];
  }
  if (typeof payload === "object" && payload !== null && Array.isArray((payload as Record<string, unknown>).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export function fetchOutburstHealth() {
  return request<OutburstHealth>("health");
}

export function fetchOutburstStats() {
  return request<OutburstStats>("stats");
}

export async function fetchOutburstSensors() {
  return unwrapArray<OutburstSensorMeta>(await request("sensors/latest"), "sensors");
}

export async function fetchOutburstMeta() {
  return unwrapArray<OutburstSensorMeta>(await request("meta"), "sensors");
}

export async function fetchOutburstWarnings(limit = 50) {
  return unwrapArray<OutburstWarning>(await request(`warnings?limit=${limit}`), "warnings");
}

export function fetchOutburstLatestWarning() {
  return request<OutburstWarning>("warnings/latest");
}

export function fetchOutburstWarning(eventId: string) {
  return request<OutburstWarning>(`warnings/${encodeURIComponent(eventId)}`);
}

export function fetchOutburstWarningContribution(eventId: string) {
  return request<OutburstWarningContribution>(`warnings/${encodeURIComponent(eventId)}/contribution`);
}

export async function fetchOutburstEventsLedger(limit = 120) {
  const payload = await request<{ events?: OutburstWarning[]; count?: number }>(`events/ledger?limit=${limit}`);
  return { events: payload.events ?? [], count: payload.count ?? payload.events?.length ?? 0 };
}

export async function fetchOutburstRecentData(limit = 120) {
  return unwrapArray<OutburstRawDataPoint>(await request(`sensor-data/recent?limit=${limit}`), "data");
}

export async function fetchOutburstRawData(params: { limit?: number; offset?: number } = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  return unwrapArray<OutburstRawDataPoint>(await request(`sensor-data?${search.toString()}`), "data");
}

export async function fetchOutburstSeries(sensorId?: string, limit = 240) {
  const search = new URLSearchParams({ limit: String(limit) });
  if (sensorId) search.set("sensor_id", sensorId);
  return unwrapArray<OutburstSeriesPoint>(await request(`sensor-data/series?${search.toString()}`), "data");
}

export function fetchOutburstStaticData() {
  return request<OutburstStaticData>("static-data");
}

export async function fetchOutburstConfig() {
  return unwrapArray<OutburstConfig>(await request("config"), "config");
}

async function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function runOutburstPredict(body?: unknown) {
  return post<Record<string, unknown>>("predict", body);
}

export function runOutburstBatchPredict(body?: unknown) {
  return post<Record<string, unknown>>("predict-batch", body);
}

export function runOutburstStaticRisk(body?: unknown) {
  return post<Record<string, unknown>>("static-risk", body);
}
