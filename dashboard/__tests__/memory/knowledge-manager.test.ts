import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { KnowledgeManager } from "@/lib/memory/knowledge-manager";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("KnowledgeManager", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let km: KnowledgeManager;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `km-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    km = new KnowledgeManager(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates a knowledge entity", async () => {
    await km.upsert("brands", "test-brand", "Test brand content.", "seed");
    const entity = await km.read("brands", "test-brand");

    expect(entity).not.toBeNull();
    expect(entity!.namespace).toBe("brands");
    expect(entity!.title).toBe("test-brand");
    expect(entity!.content).toContain("Test brand content.");
    expect(entity!.source).toBe("seed");
  });

  it("updates an existing entity", async () => {
    await km.upsert("content", "hooks", "Version 1 content.", "manual");
    await km.upsert("content", "hooks", "Version 2 content.", "autoresearch");

    const entity = await km.read("content", "hooks");
    expect(entity!.content).toContain("Version 2 content.");
    expect(entity!.source).toBe("autoresearch");
  });

  it("lists entities by namespace", async () => {
    await km.upsert("brands", "brand-a", "Brand A.", "seed");
    await km.upsert("brands", "brand-b", "Brand B.", "seed");
    await km.upsert("content", "hook-1", "Hook 1.", "seed");

    const brands = await km.list("brands");
    expect(brands).toHaveLength(2);
    const titles = brands.map(e => e.title);
    expect(titles).toContain("brand-a");
    expect(titles).toContain("brand-b");

    const content = await km.list("content");
    expect(content).toHaveLength(1);
  });

  it("enforces namespace ownership — blocks writes to shared namespaces", async () => {
    // Default tier is "business-unit", "fleet" is a shared namespace
    await expect(
      km.upsert("fleet", "some-entity", "Should be blocked.")
    ).rejects.toThrow("shared namespace");
  });

  it("lists all namespaces", async () => {
    await km.upsert("content", "item-1", "Content.", "seed");
    await km.upsert("brands", "item-2", "Brand.", "seed");

    const namespaces = await km.listNamespaces();
    expect(namespaces).toContain("content");
    expect(namespaces).toContain("brands");
  });
});
