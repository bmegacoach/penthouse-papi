import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { TacitManager } from "@/lib/memory/tacit-manager";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("TacitManager", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let tm: TacitManager;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `tm-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    tm = new TacitManager(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads a tacit rule", async () => {
    const tacitPath = engine.resolvePath("tacit", "test-rule.md");
    const seedContent = `---\ntitle: test-rule\nconfidence: 4\nupdated_at: 2026-03-23T00:00:00Z\n---\n\nContrarian hooks outperform. Always cite numbers.`;
    await engine.enqueueWrite(tacitPath, seedContent, "overwrite");

    const rule = await tm.read("test-rule");
    expect(rule).not.toBeNull();
    expect(rule!.title).toBe("test-rule");
    expect(rule!.confidence).toBe(4);
    expect(rule!.content).toContain("Contrarian hooks outperform");
  });

  it("lists all tacit rules", async () => {
    const tacitPath1 = engine.resolvePath("tacit", "rule-a.md");
    const tacitPath2 = engine.resolvePath("tacit", "rule-b.md");

    const seed = (title: string) =>
      `---\ntitle: ${title}\nconfidence: 3\nupdated_at: 2026-03-23T00:00:00Z\n---\n\nRule content for ${title}.`;

    await engine.enqueueWrite(tacitPath1, seed("rule-a"), "overwrite");
    await engine.enqueueWrite(tacitPath2, seed("rule-b"), "overwrite");

    const rules = await tm.list();
    expect(rules).toHaveLength(2);
  });

  it("blocks direct writes (only consolidation can write)", async () => {
    await expect(
      tm.write("new-rule", "Some rule content.", 3)
    ).rejects.toThrow("consolidation");
  });

  it("allows writes when caller is consolidation", async () => {
    await tm.write("consolidated-rule", "This rule was written by consolidation.", 5, true, "2026-03-23.md");

    const rule = await tm.read("consolidated-rule");
    expect(rule).not.toBeNull();
    expect(rule!.title).toBe("consolidated-rule");
    expect(rule!.confidence).toBe(5);
    expect(rule!.content).toContain("written by consolidation");
    expect(rule!.origin_daily_note).toBe("2026-03-23.md");
  });
});
