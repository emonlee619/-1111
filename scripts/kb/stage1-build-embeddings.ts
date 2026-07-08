import { supabaseRest } from "./stage1-supabase-common.ts";

type Card = {
  id: string;
  card_code: string;
  title: string;
  summary: string | null;
  full_content: string | null;
  category: string;
  source_type: string | null;
};

function fakeEmbedding(seed: string): number[] {
  // Deterministic placeholder for pipeline validation. Replace with a real embedding model before production RAG.
  const values = new Array(1536).fill(0).map((_, index) => {
    const code = seed.charCodeAt(index % Math.max(seed.length, 1)) || 1;
    return Number((((code * (index + 17)) % 997) / 997).toFixed(6));
  });
  return values;
}

const cards = await supabaseRest<Card[]>("knowledge_cards?select=id,card_code,title,summary,full_content,category,source_type&status=eq.published&limit=500");
const embeddings = cards.map((card) => {
  const content = [card.title, card.summary, card.full_content].filter(Boolean).join("\n");
  return {
    target_type: "knowledge_card",
    target_id: card.id,
    card_code: card.card_code,
    content,
    embedding: fakeEmbedding(content),
    metadata: { category: card.category, source_type: card.source_type, placeholder_embedding: true }
  };
});

if (embeddings.length > 0) {
  await supabaseRest("knowledge_embeddings", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(embeddings)
  });
}

console.log(`built_placeholder_embeddings=${embeddings.length}`);
