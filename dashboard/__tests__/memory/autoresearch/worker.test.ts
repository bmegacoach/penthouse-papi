import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { AutoresearchWorker } from "@/lib/memory/autoresearch/worker";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("AutoresearchWorker", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let worker: AutoresearchWorker;
  let queue: ResearchQueue;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `worker-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    worker = new AutoresearchWorker(engine, {});
    queue = new ResearchQueue(engine);
    // Ensure research dir exists with empty queue
    const queuePath = engine.resolvePath("research", "queue.json");
    await engine.enqueueWrite(queuePath, "[]", "overwrite");
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when queue is empty", async () => {
    const result = await worker.processNext();
    expect(result).toBeNull();
  });

  it("processes an item and handles missing API keys gracefully", async () => {
    await queue.add({
      question: "What are the latest market trends?",
      context: "Content strategy planning",
      trigger: "manual",
      priority: "p1",
      namespace: "content",
    });

    // Worker has no API keys configured — should fail gracefully
    const result = await worker.processNext();

    // Item should have been processed (returned, not null)
    expect(result).not.toBeNull();
    expect(result!.question).toBe("What are the latest market trends?");

    // Item should not be in the active queue (either failed or completed)
    const items = await queue.list();
    const active = items.find(i => i.status === "active");
    expect(active).toBeUndefined();
  });
});
