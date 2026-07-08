import { readFileSync } from "node:fs";
import { chunkText, supabaseRest } from "./stage1-supabase-common.ts";

type SourceInput = {
  title: string;
  doc_type: string;
  file_name?: string;
  file_ext?: string;
  source_org?: string;
  author?: string;
  publish_year?: number;
  version?: string;
  description?: string;
  storage_bucket?: string;
  storage_path?: string;
  content_path?: string;
  keywords?: string[];
};

const inputPath = process.argv[2] ?? "docs/kb-source-manifest.example.json";
const inputs = JSON.parse(readFileSync(inputPath, "utf8")) as Array<SourceInput & Record<string, unknown>>;

for (const item of inputs) {
  const rows = await supabaseRest<Array<{ id: string }>>("source_documents?select=id", {
    method: "POST",
    headers: { prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify({
      title: item.title,
      doc_type: item.doc_type ?? item.source_type ?? "unknown",
      storage_bucket: item.storage_bucket || null,
      storage_path: item.storage_path || null,
      file_name: item.file_name || null,
      file_ext: item.file_ext || null,
      source_org: item.source_org ?? item.issuing_authority ?? null,
      author: item.author || null,
      publish_year: item.publish_year || null,
      version: item.version || null,
      description: item.description ?? item.abstract ?? null,
      status: item.status === "retired" ? "retired" : "active"
    })
  });

  const sourceId = rows[0]?.id;
  if (!sourceId || !item.content_path) continue;
  const content = readFileSync(String(item.content_path), "utf8");
  const chunks = chunkText(content).map((chunk, index) => ({
    source_document_id: sourceId,
    chunk_index: index,
    content: chunk,
    keywords: item.keywords ?? [],
    metadata: { imported_from: inputPath, title: item.title }
  }));
  if (chunks.length > 0) {
    await supabaseRest("document_chunks", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify(chunks)
    });
  }
}

console.log(`imported_sources=${inputs.length}`);
