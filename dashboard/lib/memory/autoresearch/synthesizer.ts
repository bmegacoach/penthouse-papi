export interface SynthesisInput {
  question: string;
  context: string;
  sourceResults: { source: string; data: string }[];
}

export interface SynthesisOutput {
  summary: string;
  sources: { url: string; title: string; relevance: string }[];
  knowledge_updates: string[];
  tacit_proposals: string[];
  partial?: boolean;
}

export async function synthesize(input: SynthesisInput, apiKey: string): Promise<SynthesisOutput> {
  const sourceBlock = input.sourceResults.map(s => `### Source: ${s.source}\n${s.data}`).join("\n\n");
  const prompt = `You are a research synthesizer for a content creation studio called Penthouse Papi.

Question: ${input.question}
Context: ${input.context}

Raw research data:
${sourceBlock}

Respond with a JSON object:
{
  "summary": "2-3 paragraph synthesis of findings",
  "sources": [{"url": "...", "title": "...", "relevance": "one sentence"}],
  "knowledge_updates": ["list of facts to add to the knowledge graph"],
  "tacit_proposals": ["list of behavioral rules suggested by findings, if any"]
}

Only include tacit_proposals if findings strongly suggest a repeatable pattern. Be concise.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }] }),
  });

  if (!res.ok) throw new Error(`Synthesis failed: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Synthesis returned non-JSON response");
  return JSON.parse(jsonMatch[0]);
}
