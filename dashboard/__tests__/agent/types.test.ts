import { describe, it, expect } from "vitest";
import type { AgentContext, AgentAction, AgentResponse, Message } from "@/lib/agent/types";

describe("Agent types", () => {
  it("AgentContext is structurally valid", () => {
    const ctx: AgentContext = {
      page: "hyperedit",
      brand: "gbb",
      pageData: { jobCount: 3 },
      selectedItem: { type: "job", id: "abc", data: { status: "ready" } },
    };
    expect(ctx.page).toBe("hyperedit");
    expect(ctx.selectedItem?.type).toBe("job");
  });

  it("AgentAction is structurally valid", () => {
    const action: AgentAction = {
      type: "create_concept",
      params: { title: "Test", brand: "GBB", tags: ["video"] },
      description: "Create a GBB concept about gold ETFs",
    };
    expect(action.type).toBe("create_concept");
  });
});
