import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("ResearchQueue", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let queue: ResearchQueue;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `queue-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    queue = new ResearchQueue(engine);
    // Ensure research dir exists with empty queue
    const queuePath = engine.resolvePath("research", "queue.json");
    await engine.enqueueWrite(queuePath, "[]", "overwrite");
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("adds an item to the queue", async () => {
    await queue.add({
      question: "What are the latest market trends?",
      context: "Content strategy",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });
    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("queued");
    expect(items[0].question).toBe("What are the latest market trends?");
  });

  it("claims the next item by priority", async () => {
    await queue.add({
      question: "Low priority question",
      context: "ctx",
      trigger: "manual",
      priority: "p2",
      namespace: "content",
    });
    await queue.add({
      question: "High priority question",
      context: "ctx",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });

    const claimed = await queue.claimNext();
    expect(claimed).not.toBeNull();
    expect(claimed!.priority).toBe("p1");
    expect(claimed!.status).toBe("active");
  });

  it("marks an item complete and removes it from the queue", async () => {
    const id = await queue.add({
      question: "Test question",
      context: "ctx",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });
    await queue.claim(id);
    await queue.complete(id, {
      summary: "Test summary",
      sources: [],
      knowledge_updates: [],
      tacit_proposals: [],
      partial: false,
    });

    const items = await queue.list();
    expect(items.find(i => i.id === id)).toBeUndefined();
  });

  it("marks an item failed and increments retries", async () => {
    const id = await queue.add({
      question: "Test question",
      context: "ctx",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });
    await queue.claim(id);
    await queue.fail(id, "Something went wrong");

    const items = await queue.list();
    const item = items.find(i => i.id === id);
    expect(item).toBeDefined();
    expect(item!.status).toBe("failed");
    expect(item!.retries).toBe(1);
    expect(item!.error).toBe("Something went wrong");
  });

  it("marks item dead after 3 retries and removes from queue", async () => {
    const id = await queue.add({
      question: "Failing question",
      context: "ctx",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });

    // First fail
    await queue.claim(id);
    await queue.fail(id, "error 1");

    // Manually set status back to queued so we can claim again
    {
      const items = await queue.list();
      const item = items.find(i => i.id === id)!;
      item.status = "queued";
      await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), JSON.stringify(items, null, 2), "overwrite");
    }

    // Second fail
    await queue.claim(id);
    await queue.fail(id, "error 2");

    // Manually set status back to queued
    {
      const items = await queue.list();
      const item = items.find(i => i.id === id)!;
      item.status = "queued";
      await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), JSON.stringify(items, null, 2), "overwrite");
    }

    // Third fail — should go dead
    await queue.claim(id);
    await queue.fail(id, "error 3");

    const items = await queue.list();
    expect(items.find(i => i.id === id)).toBeUndefined();
  });
});
