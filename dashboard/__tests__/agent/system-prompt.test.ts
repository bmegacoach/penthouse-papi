import { describe, it, expect, vi } from "vitest";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import type { AgentContext } from "@/lib/agent/types";

vi.mock("@/lib/memory/server", () => ({
  getTacitManager: vi.fn().mockResolvedValue({
    list: vi.fn().mockResolvedValue([
      { title: "content-rules", content: "Contrarian hooks outperform 3x.", confidence: 3 },
    ]),
  }),
  getRetriever: vi.fn().mockResolvedValue({
    search: vi.fn().mockResolvedValue({ layer: "L2", results: [] }),
  }),
}));

describe("buildSystemPrompt", () => {
  it("includes page context and tacit rules", async () => {
    const ctx: AgentContext = {
      page: "hyperedit",
      brand: "gbb",
      pageData: { jobCount: 3, readyCount: 1 },
    };
    const prompt = await buildSystemPrompt(ctx);
    expect(prompt).toContain("hyperedit");
    expect(prompt).toContain("Contrarian hooks outperform 3x");
    expect(prompt).toContain("GBB");
  });

  it("includes selected item when present", async () => {
    const ctx: AgentContext = {
      page: "concepts",
      brand: "all",
      pageData: {},
      selectedItem: { type: "concept", id: "abc", data: { title: "Gold Q2", status: "draft" } },
    };
    const prompt = await buildSystemPrompt(ctx);
    expect(prompt).toContain("Gold Q2");
    expect(prompt).toContain("draft");
  });
});
