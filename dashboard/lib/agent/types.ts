import type { BrandFilter } from "@/lib/brand-context";

export type AgentPage =
  | "command-center" | "calendar" | "concepts" | "hyperedit"
  | "studio" | "analytics" | "memory" | "scenario-lab" | "manual" | "settings";

export interface AgentContext {
  page: AgentPage;
  brand: BrandFilter;
  pageData: Record<string, unknown>;
  selectedItem?: {
    type: "concept" | "job" | "clip" | "calendar-entry" | "research-item";
    id: string;
    data: Record<string, unknown>;
  };
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentAction {
  type: "create_concept" | "advance_concept" | "create_job" | "schedule_clip"
      | "search_memory" | "append_memory" | "submit_research" | "navigate";
  params: Record<string, unknown>;
  description: string;
}

export interface AgentResponse {
  message: string;
  actions?: AgentAction[];
  memoryCitations?: { layer: "L1" | "L2" | "L3"; source: string; snippet: string }[];
}

export interface AgentBackend {
  chat(messages: Message[], context: AgentContext): Promise<AgentResponse>;
}
