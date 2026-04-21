import type { AgentContext, AgentBackend, AgentResponse, AgentAction, Message } from "./types";
import { buildSystemPrompt } from "./system-prompt";
import { generate } from "@/lib/llm/openrouter";

export function parseActions(text: string): AgentAction[] {
  const actions: AgentAction[] = [];
  const regex = /```action\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.type && parsed.description) {
        actions.push({
          type: parsed.type,
          params: parsed.params || {},
          description: parsed.description,
        });
      }
    } catch { /* skip malformed */ }
  }
  return actions;
}

export function stripActionBlocks(text: string): string {
  return text.replace(/```action\s*\n[\s\S]*?\n```/g, "").trim();
}

export class OpenRouterBackend implements AgentBackend {
  async chat(messages: Message[], context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = await buildSystemPrompt(context);
    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];
    const raw = await generate({ messages: fullMessages, temperature: 0.7, max_tokens: 2048 });
    const actions = parseActions(raw);
    return { message: stripActionBlocks(raw), actions: actions.length > 0 ? actions : undefined };
  }
}

export class OpenFangBackend implements AgentBackend {
  private url: string;
  private apiKey: string;

  constructor(url?: string, apiKey?: string) {
    this.url = url || process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENFANG_API_KEY || "";
  }

  async chat(messages: Message[], context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = await buildSystemPrompt(context);
    const res = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        context: { page: context.page, brand: context.brand },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`OpenFang ${res.status}`);
    const data = await res.json();
    const raw = data.message || data.choices?.[0]?.message?.content || "";
    const actions = parseActions(raw);
    return { message: stripActionBlocks(raw), actions: actions.length > 0 ? actions : undefined };
  }
}

export class AgentRouter implements AgentBackend {
  constructor(private primary: AgentBackend, private fallback: AgentBackend) {}

  async chat(messages: Message[], context: AgentContext): Promise<AgentResponse> {
    try {
      return await this.primary.chat(messages, context);
    } catch {
      return await this.fallback.chat(messages, context);
    }
  }
}
