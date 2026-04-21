import { describe, it, expect, vi } from "vitest";
import { AgentRouter, OpenRouterBackend } from "@/lib/agent/router";
import type { AgentContext, AgentResponse, Message } from "@/lib/agent/types";

vi.mock("@/lib/llm/openrouter", () => ({
  generate: vi.fn().mockResolvedValue("Here is my response about your GBB content."),
}));

vi.mock("@/lib/agent/system-prompt", () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue("You are the Penthouse Papi AI copilot."),
}));

const CTX: AgentContext = { page: "concepts", brand: "gbb", pageData: {} };

describe("OpenRouterBackend", () => {
  it("returns a message from generate()", async () => {
    const backend = new OpenRouterBackend();
    const msgs: Message[] = [{ role: "user", content: "What should I create?" }];
    const res = await backend.chat(msgs, CTX);
    expect(res.message).toContain("GBB");
  });
});

describe("AgentRouter", () => {
  it("falls back to secondary when primary throws", async () => {
    const failing = { chat: vi.fn().mockRejectedValue(new Error("offline")) };
    const working = { chat: vi.fn().mockResolvedValue({ message: "fallback works" }) };
    const router = new AgentRouter(failing, working);
    const res = await router.chat([{ role: "user", content: "test" }], CTX);
    expect(res.message).toBe("fallback works");
    expect(failing.chat).toHaveBeenCalled();
    expect(working.chat).toHaveBeenCalled();
  });

  it("uses primary when it succeeds", async () => {
    const primary = { chat: vi.fn().mockResolvedValue({ message: "primary works" }) };
    const fallback = { chat: vi.fn() };
    const router = new AgentRouter(primary, fallback);
    const res = await router.chat([{ role: "user", content: "test" }], CTX);
    expect(res.message).toBe("primary works");
    expect(fallback.chat).not.toHaveBeenCalled();
  });
});
