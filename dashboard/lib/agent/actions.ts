import type { AgentAction } from "./types";

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeAction(action: AgentAction): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "create_concept": {
        const { title, brand, tags, description } = action.params as Record<string, unknown>;
        const res = await fetch("/api/concepts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, brand, tags, description }),
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "advance_concept": {
        const { conceptId, status } = action.params as Record<string, unknown>;
        const res = await fetch(`/api/concepts/${conceptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "create_job": {
        const { name, brand, sourcePath, conceptId } = action.params as Record<string, unknown>;
        const res = await fetch("/api/hyperedit/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, brand, sourcePath: sourcePath || "agent-created", source: "url", conceptId }),
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "search_memory": {
        const { query } = action.params as Record<string, unknown>;
        const res = await fetch(`/api/search?q=${encodeURIComponent(String(query))}`);
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "append_memory": {
        const { content, tags } = action.params as Record<string, unknown>;
        const res = await fetch("/api/memory/daily/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, source: "agent-copilot", tags }),
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "submit_research": {
        const { question, priority } = action.params as Record<string, unknown>;
        const res = await fetch("/api/memory/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, priority: priority || "p2" }),
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        return { success: true, data: await res.json() };
      }

      case "navigate": {
        return { success: true, data: { navigate: action.params } };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Action failed" };
  }
}
