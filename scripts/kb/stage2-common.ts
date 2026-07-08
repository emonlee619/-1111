import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export type JsonRecord = Record<string, unknown>;

export const REPO_ROOT = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
export const REPORT_DIR = join(REPO_ROOT, "local-kb", "reports");
export const APPENDIX_MD = join(REPO_ROOT, "瓦斯突出预警系统完整附录卡_v2_63维.md");
export const DYNAMIC_XLSX = join(REPO_ROOT, "动态-6-10.xlsx");

export const CARD_CATEGORIES = new Set([
  "dynamic_indicator",
  "static_risk",
  "control_measure",
  "hidden_danger_template",
  "legal_basis",
  "threshold_rule",
  "cause_chain",
  "risk_mechanism",
  "ai_guardrail",
  "report_template",
  "faq"
]);

export const SOURCE_TYPES = new Set([
  "real_sensor",
  "physics_constrained",
  "static_prior",
  "manual_check",
  "legal_standard",
  "system_rule",
  "unknown"
]);

export type SourceDocument = {
  id?: string;
  title: string;
  doc_type: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  file_ext?: string | null;
  file_size?: number | null;
  source_org?: string | null;
  author?: string | null;
  publish_year?: number | null;
  version?: string | null;
  description?: string | null;
  status?: string;
};

export type ChunkInput = {
  source_document_id: string;
  chunk_index: number;
  section_path?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  content: string;
  keywords?: string[];
  metadata?: JsonRecord;
};

export type KnowledgeCardInput = {
  card_code: string;
  title: string;
  category: string;
  source_type: string;
  summary: string;
  full_content?: string;
  related_channels?: string[];
  related_risks?: string[];
  related_locations?: string[];
  physical_meaning?: string;
  abnormal_signs?: string[];
  verification_actions?: string[];
  control_measures?: string[];
  legal_basis?: string[];
  threshold_rules?: JsonRecord;
  risk_level?: string;
  reliability_weight?: number;
  model_boundary?: string;
  human_review_policy?: string;
  source_document_ids?: string[];
  chunk_ids?: string[];
  confidence_level?: string;
  needs_human_review?: boolean;
  status?: string;
  version?: string;
};

export function ensureReportDir() {
  mkdirSync(REPORT_DIR, { recursive: true });
}

export function writeReportJson(name: string, value: unknown) {
  ensureReportDir();
  writeFileSync(join(REPORT_DIR, name), JSON.stringify(value, null, 2), "utf8");
}

export function readUtf8(path: string) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

export function fileDoc(path: string, title: string, docType: string, description: string): SourceDocument {
  const stats = statSync(path);
  return {
    title,
    doc_type: docType,
    file_name: basename(path),
    file_ext: extname(path).replace(".", "").toLowerCase(),
    file_size: stats.size,
    source_org: "project-local",
    version: title.includes("v2_63") ? "v2.0-doc-2026-07-04" : "stage2",
    description,
    status: "active"
  };
}

export function hashCode(prefix: string, value: string) {
  return `${prefix}-${createHash("sha1").update(value).digest("hex").slice(0, 12).toUpperCase()}`;
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function chunkText(content: string, size = 1400, overlap = 160): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    const next = Math.min(cursor + size, normalized.length);
    chunks.push(normalized.slice(cursor, next).trim());
    if (next === normalized.length) break;
    cursor = Math.max(0, next - overlap);
  }
  return chunks.filter(Boolean);
}

export function markdownSections(content: string) {
  const lines = content.split(/\r?\n/);
  const sections: Array<{ title: string; content: string }> = [];
  let title = "root";
  let buffer: string[] = [];
  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line)) {
      if (buffer.join("\n").trim()) sections.push({ title, content: buffer.join("\n") });
      title = line.replace(/^#{1,4}\s+/, "").trim();
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.join("\n").trim()) sections.push({ title, content: buffer.join("\n") });
  return sections;
}

export function parseMarkdownTables(content: string) {
  const tables: string[][][] = [];
  const lines = content.split(/\r?\n/);
  let current: string[][] = [];
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) current.push(cells);
    } else if (current.length > 0) {
      if (current.length > 1) tables.push(current);
      current = [];
    }
  }
  if (current.length > 1) tables.push(current);
  return tables;
}

export function rowsByCode(content: string, pattern: RegExp) {
  const rows: string[][] = [];
  for (const table of parseMarkdownTables(content)) {
    for (const row of table.slice(1)) {
      if (pattern.test(row[0] ?? "")) rows.push(row);
    }
  }
  return rows;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error("Invalid xlsx: missing central directory.");
}

function unzipEntries(path: string) {
  const buffer = readFileSync(path);
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  let offset = centralOffset;
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    entries.set(name, method === 8 ? inflateRawSync(compressed) : compressed);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function readXlsxAsText(path: string) {
  if (!existsSync(path)) return "";
  const entries = unzipEntries(path);
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = Array.from(sharedXml.matchAll(/<si\b[\s\S]*?<\/si>/g)).map((match) => xmlText(match[0]));
  const sheets = Array.from(entries.entries())
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b));
  const rows: string[] = [];
  for (const [sheetName, sheetBuffer] of sheets) {
    const xml = sheetBuffer.toString("utf8");
    rows.push(`# ${sheetName}`);
    for (const rowMatch of xml.matchAll(/<row\b[\s\S]*?<\/row>/g)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attrs = cellMatch[1];
        const body = cellMatch[2];
        const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
        if (attrs.includes('t="s"')) {
          cells.push(shared[Number(value)] ?? "");
        } else {
          cells.push(xmlText(value));
        }
      }
      const line = cells.map(normalizeWhitespace).filter(Boolean).join(" | ");
      if (line) rows.push(line);
    }
  }
  return rows.join("\n");
}

export function getSupabaseEnv() {
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
  headers.set("accept", "application/json");
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function findSourceDocumentId(title: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(`source_documents?select=id&title=eq.${encodeURIComponent(title)}&limit=1`);
  return rows[0]?.id;
}

export async function upsertSourceDocument(doc: SourceDocument) {
  const existingId = await findSourceDocumentId(doc.title);
  if (existingId) {
    await supabaseRest(`source_documents?id=eq.${existingId}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ ...doc, updated_at: new Date().toISOString() })
    });
    return existingId;
  }
  const rows = await supabaseRest<Array<{ id: string }>>("source_documents?select=id", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(doc)
  });
  if (!rows[0]?.id) throw new Error(`source document insert returned no id: ${doc.title}`);
  return rows[0].id;
}

export async function createReviewTask(input: {
  target_type: string;
  target_id?: string | null;
  card_code?: string | null;
  review_reason: string;
  review_result?: string | null;
}) {
  await supabaseRest("knowledge_review_tasks", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      target_type: input.target_type,
      target_id: input.target_id ?? null,
      card_code: input.card_code ?? null,
      review_reason: input.review_reason,
      review_result: input.review_result ?? null,
      review_status: "pending"
    })
  });
}

export function getAiEnv() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  const embeddingModel = process.env.AI_EMBEDDING_MODEL;
  if (!apiKey || !baseUrl || !model) {
    throw new Error("Missing AI_API_KEY, AI_BASE_URL, or AI_MODEL.");
  }
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model, embeddingModel };
}

export async function aiChatJson<T>(messages: Array<{ role: "system" | "user"; content: string }>): Promise<T> {
  const env = getAiEnv();
  const response = await fetch(`${env.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.model,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`AI chat ${response.status}: ${text}`);
  const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI chat returned no content.");
  return JSON.parse(content) as T;
}

export async function aiEmbedding(input: string) {
  const env = getAiEnv();
  if (!env.embeddingModel) throw new Error("Missing AI_EMBEDDING_MODEL.");
  const response = await fetch(`${env.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ model: env.embeddingModel, input })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`AI embedding ${response.status}: ${text}`);
  const payload = JSON.parse(text) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error(`AI embedding dimension must be 1536, got ${embedding?.length ?? 0}.`);
  }
  return embedding;
}

export function validateCard(card: KnowledgeCardInput) {
  if (!card.card_code || !card.title || !card.category || !card.summary) {
    throw new Error(`Knowledge card missing required fields: ${JSON.stringify(card)}`);
  }
  if (!CARD_CATEGORIES.has(card.category)) throw new Error(`Invalid category ${card.category} for ${card.card_code}`);
  if (!SOURCE_TYPES.has(card.source_type)) throw new Error(`Invalid source_type ${card.source_type} for ${card.card_code}`);
  if (card.card_code.startsWith("R") && card.source_type !== "real_sensor") {
    throw new Error(`${card.card_code} must use source_type=real_sensor.`);
  }
  if (card.card_code.startsWith("B") && card.source_type !== "physics_constrained") {
    throw new Error(`${card.card_code} must use source_type=physics_constrained.`);
  }
  if (card.source_type === "physics_constrained" && (!card.model_boundary || !card.human_review_policy)) {
    throw new Error(`${card.card_code} physics_constrained card lacks model_boundary or human_review_policy.`);
  }
  return card;
}

export function sanitizeCard(card: KnowledgeCardInput): KnowledgeCardInput {
  const next = {
    ...card,
    status: card.status ?? "published",
    version: card.version ?? "v1",
    needs_human_review: card.needs_human_review ?? true,
    confidence_level: card.confidence_level ?? "medium"
  };
  return validateCard(next);
}
