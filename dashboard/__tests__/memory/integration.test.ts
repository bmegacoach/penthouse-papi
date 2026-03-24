import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { DailyWriter } from "@/lib/memory/daily-writer";
import { EventLogger } from "@/lib/memory/event-logger";
import { KnowledgeManager } from "@/lib/memory/knowledge-manager";
import { TacitManager } from "@/lib/memory/tacit-manager";
import { Retriever } from "@/lib/memory/retriever";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { Consolidator } from "@/lib/memory/consolidator";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("Memory Engine Integration", () => {
  let tmpDir: string;
  let engine: MemoryEngine;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `integration-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "research"), { recursive: true });
    await mkdir(join(tmpDir, "memory", "state"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), "[]", "overwrite");
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("full day lifecycle: write → log → research → consolidate → retrieve", async () => {
    const dw = new DailyWriter(engine);
    const el = new EventLogger(engine);
    const km = new KnowledgeManager(engine);
    const tm = new TacitManager(engine);
    const rq = new ResearchQueue(engine);
    const retriever = new Retriever(engine, km, tm, dw);
    const consolidator = new Consolidator(engine, dw, el, km, tm);

    // 1. Write daily note
    await dw.append("Shipped dashboard with 7 pages", "claude-code");
    await dw.append("GBB conversion rate hit 4.2% this week", "claude-code", ["needs_research"]);

    // 2. Log events
    await el.log({ type: "task_complete", source: "claude-code", layer: "L1", payload: { task: "dashboard" } });

    // 3. Add knowledge
    await km.upsert("content", "hooks", "Contrarian hooks outperform 3x on LinkedIn");

    // 4. Queue research
    const researchId = await rq.add({
      question: "What gold market trends affect GBB content?",
      context: "GBB conversion spike",
      trigger: "tag",
      priority: "p1",
      namespace: "market-intel",
    });

    // 5. Run consolidation
    const consolResult = await consolidator.run();
    expect(consolResult.last_run).toBeDefined();

    // 6. Retrieve — temporal query hits L1 (keyword "dashboard" matches daily note content)
    const r1 = await retriever.search("what dashboard work happened today");
    expect(r1.layer).toBe("L1");
    expect(r1.results.length).toBeGreaterThan(0);

    // 7. Retrieve — fact query hits L2
    const r2 = await retriever.search("what are our hooks");
    expect(r2.layer).toBe("L2");
    expect(r2.results.some(r => r.content.includes("Contrarian"))).toBe(true);

    // 8. Research queue has our item
    const items = await rq.list();
    expect(items.find(i => i.id === researchId)).toBeDefined();

    // 9. Namespace enforcement
    await expect(km.upsert("fleet", "test", "hack")).rejects.toThrow();
  });
});
