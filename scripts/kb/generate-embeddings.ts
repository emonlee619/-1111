import { aiEmbedding, createReviewTask, supabaseRest, writeReportJson } from "./stage2-common.ts";

type CardRow = {
  id: string;
  card_code: string;
  title: string;
  summary: string | null;
  full_content: string | null;
  category: string;
  source_type: string | null;
};

type ChunkRow = {
  id: string;
  source_document_id: string;
  section_path: string | null;
  content: string;
};

const target = process.argv[2] ?? "cards";
const limit = Number(process.argv[3] ?? 100);
const inserted: Array<{ target_type: string; id: string; card_code?: string | null }> = [];
const failed: Array<{ target_type: string; id: string; reason: string }> = [];

async function replaceEmbedding(row: { target_type: string; target_id: string; card_code?: string | null; content: string; metadata: Record<string, unknown> }) {
  await supabaseRest(`knowledge_embeddings?target_type=eq.${row.target_type}&target_id=eq.${row.target_id}`, {
    method: "DELETE",
    headers: { prefer: "return=minimal" }
  });
  const embedding = await aiEmbedding(row.content);
  await supabaseRest("knowledge_embeddings", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      target_type: row.target_type,
      target_id: row.target_id,
      card_code: row.card_code ?? null,
      content: row.content,
      embedding,
      metadata: row.metadata
    })
  });
}

if (target === "cards" || target === "all") {
  const cards = await supabaseRest<CardRow[]>(
    `knowledge_cards?select=id,card_code,title,summary,full_content,category,source_type&status=eq.published&limit=${limit}`
  );
  for (const card of cards) {
    try {
      await replaceEmbedding({
        target_type: "knowledge_card",
        target_id: card.id,
        card_code: card.card_code,
        content: [card.title, card.summary, card.full_content].filter(Boolean).join("\n"),
        metadata: { category: card.category, source_type: card.source_type }
      });
      inserted.push({ target_type: "knowledge_card", id: card.id, card_code: card.card_code });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failed.push({ target_type: "knowledge_card", id: card.id, reason });
      await createReviewTask({ target_type: "knowledge_card", target_id: card.id, card_code: card.card_code, review_reason: `Embedding failed: ${reason}` });
    }
  }
}

if (target === "chunks" || target === "all") {
  const chunks = await supabaseRest<ChunkRow[]>(`document_chunks?select=id,source_document_id,section_path,content&limit=${limit}`);
  for (const chunk of chunks) {
    try {
      await replaceEmbedding({
        target_type: "document_chunk",
        target_id: chunk.id,
        content: chunk.content,
        metadata: { source_document_id: chunk.source_document_id, section_path: chunk.section_path }
      });
      inserted.push({ target_type: "document_chunk", id: chunk.id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failed.push({ target_type: "document_chunk", id: chunk.id, reason });
      await createReviewTask({ target_type: "document_chunk", target_id: chunk.id, review_reason: `Embedding failed: ${reason}` });
    }
  }
}

const report = { target, inserted_embeddings: inserted.length, failed_embeddings: failed.length, inserted, failed };
writeReportJson("stage2-generated-embeddings.json", report);
console.log(JSON.stringify(report, null, 2));
