type ChatMessage = { role: "system" | "user"; content: string };

function getAiConfig(requireEmbedding = false) {
  const apiKey = process.env.AI_API_KEY?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const model = process.env.AI_MODEL?.trim();
  const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim();

  if (!apiKey || !baseUrl || !model || (requireEmbedding && !embeddingModel)) {
    return null;
  }
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model, embeddingModel };
}

export async function completeWithAi(messages: ChatMessage[]) {
  const config = getAiConfig(false);
  if (!config) return null;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.1 }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`AI chat failed: ${response.status} ${await response.text()}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function generateEmbedding(input: string) {
  const config = getAiConfig(true);
  if (!config?.embeddingModel) return null;

  const response = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: config.embeddingModel, input }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`AI embedding failed: ${response.status} ${await response.text()}`);
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding ?? null;
  return embedding?.length === 1536 ? embedding : null;
}
