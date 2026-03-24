const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

export interface PerplexityResult {
  answer: string;
  citations: string[];
}

export async function queryPerplexity(question: string, apiKey: string): Promise<PerplexityResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a research assistant. Provide factual, concise answers with sources." },
          { role: "user", content: question },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { answer: data.choices?.[0]?.message?.content || "", citations: data.citations || [] };
  } finally {
    clearTimeout(timeout);
  }
}
