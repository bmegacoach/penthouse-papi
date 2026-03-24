import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { DailyWriter } from "@/lib/memory/daily-writer";
import { EventLogger } from "@/lib/memory/event-logger";
import { KnowledgeManager } from "@/lib/memory/knowledge-manager";
import { TacitManager } from "@/lib/memory/tacit-manager";
import { Consolidator } from "@/lib/memory/consolidator";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("Consolidator", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let consolidator: Consolidator;
  let dw: DailyWriter;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `consolidator-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "state"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    dw = new DailyWriter(engine);
    const el = new EventLogger(engine);
    const km = new KnowledgeManager(engine);
    const tm = new TacitManager(engine);
    consolidator = new Consolidator(engine, dw, el, km, tm);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("runs consolidation without errors on empty state", async () => {
    const result = await consolidator.run();
    expect(result.files_updated).toEqual([]);
    expect(result.last_run).toBeDefined();
  });

  it("extracts facts from daily notes into consolidation state", async () => {
    await dw.append("GBB conversion rate is 4.2% this week", "claude-code");
    await dw.append("Contrarian hooks drove 3x engagement on LinkedIn", "claude-code");

    const result = await consolidator.run();
    expect(result.last_run).toBeDefined();
    const stateRaw = await engine.readFile(engine.resolvePath("state", "consolidation.json"));
    expect(stateRaw).not.toBeNull();
  });

  it("acquires and releases lock", async () => {
    await consolidator.run();
    await consolidator.run();
  });
});
