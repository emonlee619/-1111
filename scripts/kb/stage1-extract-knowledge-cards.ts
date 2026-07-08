import { assertSafeChannelBoundary, stableCardCode, supabaseRest } from "./stage1-supabase-common.ts";

type Chunk = {
  id: string;
  source_document_id: string;
  content: string;
  keywords: string[] | null;
};

const chunks = await supabaseRest<Chunk[]>("document_chunks?select=id,source_document_id,content,keywords&limit=200");

const cards = chunks.map((chunk) => {
  const isPhysics = /B\\d{2}|物理约束|生成|估计/.test(chunk.content);
  const isReal = /R\\d{2}|传感器|实测/.test(chunk.content) && !isPhysics;
  const sourceType = isPhysics ? "physics_constrained" : isReal ? "real_sensor" : "unknown";
  const card = {
    card_code: stableCardCode("AUTO", chunk.id),
    title: chunk.content.slice(0, 48).replace(/\s+/g, " "),
    category: /隐患|闭环/.test(chunk.content) ? "hidden_danger_template" : "faq",
    source_type: sourceType,
    summary: chunk.content.slice(0, 240),
    full_content: chunk.content,
    related_channels: isPhysics ? ["B01-B41"] : isReal ? ["R01-R22"] : [],
    model_boundary: isPhysics ? "B01-B41 为 physics_constrained，不能作为真实传感器或单独强制处置依据。" : "",
    human_review_policy: "进入正式问答、报告或重大隐患判断前必须人工审核。",
    source_document_ids: [chunk.source_document_id],
    chunk_ids: [chunk.id],
    confidence_level: "medium",
    needs_human_review: true,
    status: "published"
  };
  assertSafeChannelBoundary(card);
  return card;
});

if (cards.length > 0) {
  await supabaseRest("knowledge_cards", {
    method: "POST",
    headers: { prefer: "return=minimal,resolution=merge-duplicates" },
    body: JSON.stringify(cards)
  });
}

console.log(`extracted_cards=${cards.length}`);
