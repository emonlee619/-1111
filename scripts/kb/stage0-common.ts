import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const requiredFields = [
  "source_id",
  "title",
  "source_type",
  "evidence_level",
  "issuing_authority",
  "document_no",
  "publish_date",
  "effective_date",
  "status",
  "version",
  "official_url",
  "database_source",
  "doi",
  "standard_no",
  "report_no",
  "storage_bucket",
  "storage_path",
  "local_path",
  "copyright_status",
  "access_method",
  "can_store_fulltext",
  "can_use_for_ai",
  "can_use_for_compliance",
  "needs_human_review",
  "related_modules",
  "keywords",
  "abstract",
  "notes"
] as const;

export const sourceTypes = [
  "legal_regulation",
  "standard_spec",
  "policy_notice",
  "case_report",
  "enterprise_document",
  "equipment_manual",
  "cnki_literature",
  "wos_literature",
  "data_model_evidence"
] as const;

export const evidenceLevels = ["L1", "L2", "L3", "L4", "L5"] as const;

export const relatedModules = [
  "monitoring_warning",
  "source_tracing",
  "dual_prevention",
  "digital_twin",
  "data_model",
  "knowledge_intelligence",
  "report_generation",
  "system_management"
] as const;

export type SourceRecord = Record<(typeof requiredFields)[number], unknown>;

export type DedupResult = {
  duplicate_source_id: Record<string, string[]>;
  duplicate_title: Record<string, string[]>;
  duplicate_doi: Record<string, string[]>;
  duplicate_standard_no: Record<string, string[]>;
  duplicate_report_no: Record<string, string[]>;
};

export function repoPath(...parts: string[]) {
  return resolve(process.cwd(), ...parts);
}

export function readManifest(path = repoPath("docs", "kb-source-manifest.example.json")): SourceRecord[] {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Manifest must be a JSON array: ${path}`);
  }
  return parsed as SourceRecord[];
}

export function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

export function normalizeRecord(record: SourceRecord): SourceRecord {
  const normalized: SourceRecord = { ...record };
  for (const key of requiredFields) {
    if (!(key in normalized)) {
      normalized[key] = key === "related_modules" || key === "keywords" ? [] : "";
    }
  }
  normalized.source_id = String(normalized.source_id).trim();
  normalized.title = String(normalized.title).trim();
  normalized.source_type = String(normalized.source_type).trim();
  normalized.evidence_level = String(normalized.evidence_level).trim();
  normalized.related_modules = Array.isArray(normalized.related_modules) ? normalized.related_modules : [];
  normalized.keywords = Array.isArray(normalized.keywords) ? normalized.keywords : [];
  for (const key of ["can_store_fulltext", "can_use_for_ai", "can_use_for_compliance", "needs_human_review"] as const) {
    normalized[key] = Boolean(normalized[key]);
  }
  return normalized;
}

export function normalizeManifest(records: SourceRecord[]) {
  return records
    .map(normalizeRecord)
    .sort((a, b) => String(a.source_id).localeCompare(String(b.source_id), "zh-Hans-CN"));
}

export function validateRecord(record: SourceRecord, index: number): string[] {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (!(field in record)) {
      errors.push(`row ${index}: missing field ${field}`);
    }
  }
  if (!sourceTypes.includes(record.source_type as any)) {
    errors.push(`row ${index}: invalid source_type ${String(record.source_type)}`);
  }
  if (!evidenceLevels.includes(record.evidence_level as any)) {
    errors.push(`row ${index}: invalid evidence_level ${String(record.evidence_level)}`);
  }
  if (!Array.isArray(record.related_modules) || record.related_modules.length === 0) {
    errors.push(`row ${index}: related_modules must contain at least one module`);
  } else {
    for (const moduleName of record.related_modules) {
      if (!relatedModules.includes(moduleName as any)) {
        errors.push(`row ${index}: invalid related module ${String(moduleName)}`);
      }
    }
  }
  if (record.can_use_for_compliance === true && !["L1", "L2", "L3", "L4"].includes(String(record.evidence_level))) {
    errors.push(`row ${index}: L5 records cannot be compliance sources`);
  }
  if (["cnki_literature", "wos_literature"].includes(String(record.source_type)) && record.can_use_for_compliance === true) {
    errors.push(`row ${index}: literature cannot replace compliance sources`);
  }
  if (record.can_use_for_ai === true && record.needs_human_review !== true) {
    errors.push(`row ${index}: AI-usable stage0 records must keep needs_human_review=true`);
  }
  return errors;
}

export function validateManifest(records: SourceRecord[]) {
  return records.flatMap((record, index) => validateRecord(record, index + 1));
}

function addDuplicate(map: Map<string, string[]>, key: unknown, sourceId: unknown) {
  const value = String(key ?? "").trim().toLowerCase();
  if (!value) return;
  const id = String(sourceId ?? "").trim();
  map.set(value, [...(map.get(value) ?? []), id]);
}

function duplicatesOnly(map: Map<string, string[]>) {
  return Object.fromEntries([...map.entries()].filter(([, ids]) => ids.length > 1));
}

export function deduplicate(records: SourceRecord[]): DedupResult {
  const sourceId = new Map<string, string[]>();
  const title = new Map<string, string[]>();
  const doi = new Map<string, string[]>();
  const standardNo = new Map<string, string[]>();
  const reportNo = new Map<string, string[]>();
  for (const record of records) {
    addDuplicate(sourceId, record.source_id, record.source_id);
    addDuplicate(title, record.title, record.source_id);
    addDuplicate(doi, record.doi, record.source_id);
    addDuplicate(standardNo, record.standard_no, record.source_id);
    addDuplicate(reportNo, record.report_no, record.source_id);
  }
  return {
    duplicate_source_id: duplicatesOnly(sourceId),
    duplicate_title: duplicatesOnly(title),
    duplicate_doi: duplicatesOnly(doi),
    duplicate_standard_no: duplicatesOnly(standardNo),
    duplicate_report_no: duplicatesOnly(reportNo)
  };
}

export function hasDuplicates(result: DedupResult) {
  return Object.values(result).some((group) => Object.keys(group).length > 0);
}

export function countBy(records: SourceRecord[], field: keyof SourceRecord) {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const key = String(record[field] ?? "unknown") || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function countWhere(records: SourceRecord[], predicate: (record: SourceRecord) => boolean) {
  return records.filter(predicate).length;
}

export function fileExists(path: string) {
  return existsSync(path);
}
