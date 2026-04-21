import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAction } from "@/lib/agent/actions";
import type { AgentAction } from "@/lib/agent/types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("executeAction", () => {
  it("creates a concept via API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ concept: { id: "c1", title: "Gold ETFs" } }),
    });

    const action: AgentAction = {
      type: "create_concept",
      params: { title: "Gold ETFs", brand: "GBB", tags: ["video"] },
      description: "Create GBB concept",
    };
    const result = await executeAction(action);
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/concepts", expect.objectContaining({ method: "POST" }));
  });

  it("searches memory", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ layer: "L2", results: [{ content: "gold data" }] }),
    });

    const action: AgentAction = {
      type: "search_memory",
      params: { query: "gold trends" },
      description: "Search memory for gold",
    };
    const result = await executeAction(action);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("returns error for unknown action type", async () => {
    const action = { type: "unknown_action", params: {}, description: "bad" } as AgentAction;
    const result = await executeAction(action);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown");
  });
});
