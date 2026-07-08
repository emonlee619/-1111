import { aiChatJson, createReviewTask, hashCode, sanitizeCard, supabaseRest, writeReportJson, type KnowledgeCardInput } from "./stage2-common.ts";

type ChunkRow = {
  id: string;
  source_document_id: string;
  section_path: string | null;
  content: string;
};

type AiCards = { cards?: KnowledgeCardInput[] };

const limit = Number(process.argv[2] ?? 40);
const chunks = await supabaseRest<ChunkRow[]>(
  `document_chunks?select=id,source_document_id,section_path,content&order=created_at.asc&limit=${limit}`
);

const inserted: string[] = [];
const failed: Array<{ chunk_id: string; reason: string }> = [];

for (const chunk of chunks) {
  try {
    const result = await aiChatJson<AiCards>([
      {
        role: "system",
        content:
          "你是煤矿瓦斯突出知识库抽取器。只输出 JSON object: {\"cards\": [...]}。每条卡必须包含 card_code,title,category,source_type,summary。法规条款只作为 legal_basis，不得扩展成现场处置结论。不确定内容 needs_human_review=true。B01-B41 必须 source_type=physics_constrained 且写 model_boundary/human_review_policy。R01-R22 必须 source_type=real_sensor。"
      },
      {
        role: "user",
        content: `source_document_id=${chunk.source_document_id}\nchunk_id=${chunk.id}\nsection=${chunk.section_path ?? ""}\n\n${chunk.content}`
      }
    ]);
    const cards = (result.cards ?? []).map((card) =>
      sanitizeCard({
        ...card,
        card_code: card.card_code || hashCode("AI", chunk.id + card.title),
        source_document_ids: Array.from(new Set([...(card.source_document_ids ?? []), chunk.source_document_id])),
        chunk_ids: Array.from(new Set([...(card.chunk_ids ?? []), chunk.id])),
        needs_human_review: card.needs_human_review ?? true
      })
    );
    if (cards.length === 0) throw new Error("AI returned no cards.");
    await supabaseRest("knowledge_cards?on_conflict=card_code", {
      method: "POST",
      headers: { prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify(cards)
    });
    inserted.push(...cards.map((card) => card.card_code));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failed.push({ chunk_id: chunk.id, reason });
    await createReviewTask({
      target_type: "document_chunk",
      target_id: chunk.id,
      review_reason: `AI extraction failed: ${reason}`,
      review_result: JSON.stringify({ source_document_id: chunk.source_document_id, section_path: chunk.section_path })
    });
  }
}

const report = { processed_chunks: chunks.length, inserted_cards: inserted.length, failed_chunks: failed.length, inserted, failed };
writeReportJson("stage2-extracted-knowledge-cards.json", report);
console.log(JSON.stringify(report, null, 2));
