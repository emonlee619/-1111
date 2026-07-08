import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function errorJson(error: unknown, status = 503) {
  return json({ error: error instanceof Error ? error.message : String(error) }, status);
}

export function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}
