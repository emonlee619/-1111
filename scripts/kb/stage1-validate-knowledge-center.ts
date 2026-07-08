import { supabaseRest } from "./stage1-supabase-common.ts";

const tables = [
  "source_documents",
  "document_chunks",
  "knowledge_cards",
  "knowledge_relations",
  "knowledge_rules",
  "knowledge_templates",
  "knowledge_embeddings",
  "knowledge_review_tasks",
  "knowledge_audit_logs",
  "ai_qa_sessions",
  "ai_qa_messages",
  "report_generation_records"
];

const results: Record<string, number> = {};
for (const table of tables) {
  const rows = await supabaseRest<Array<Record<string, unknown>>>(`${table}?select=id&limit=1000`);
  results[table] = rows.length;
}

const cards = await supabaseRest<Array<{ card_code: string; source_type: string; model_boundary: string | null }>>(
  "knowledge_cards?select=card_code,source_type,model_boundary&source_type=eq.physics_constrained"
);
const unsafe = cards.filter((card) => !card.model_boundary);
if (unsafe.length > 0) {
  throw new Error(`physics_constrained cards missing model_boundary: ${unsafe.map((card) => card.card_code).join(", ")}`);
}

console.log(JSON.stringify({ status: "passed", table_counts: results }, null, 2));
