import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { KnowledgeManager } from "@/lib/memory/knowledge-manager";
import { TacitManager } from "@/lib/memory/tacit-manager";
import { DailyWriter } from "@/lib/memory/daily-writer";
import { Retriever } from "@/lib/memory/retriever";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("Retriever", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let retriever: Retriever;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `retriever-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);

    const km = new KnowledgeManager(engine);
    const tm = new TacitManager(engine);
    const dw = new DailyWriter(engine);

    await km.upsert("content", "hooks", "Contrarian hooks win big on LinkedIn");
    await km.upsert("brands", "gbb", "Goldbackbond is a gold-backed bond product");
    await tm.write("content-rules", "Always lead with data, never hype", 5, true);
    await dw.append("Shipped the dashboard build today", "claude-code");

    retriever = new Retriever(engine, km, tm, dw);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("routes temporal queries to L1", async () => {
    const results = await retriever.search("what did we do today");
    expect(results.layer).toBe("L1");
    expect(results.results.length).toBeGreaterThan(0);
  });

  it("routes fact queries to L2", async () => {
    const results = await retriever.search("what is goldbackbond");
    expect(results.layer).toBe("L2");
    expect(results.results.some(r => r.content.includes("gold-backed"))).toBe(true);
  });

  it("routes behavioral queries to L3", async () => {
    const results = await retriever.search("what is our rule for content");
    expect(results.layer).toBe("L3");
    expect(results.results.some(r => r.content.includes("data"))).toBe(true);
  });

  it("falls through to secondary layers on no results", async () => {
    const results = await retriever.search("what is the API endpoint for hooks");
    expect(results.results.length).toBeGreaterThan(0);
  });
});
