import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("MemoryEngine", () => {
  let tmpDir: string;
  let engine: MemoryEngine;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `memory-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("is a singleton", async () => {
    const engine2 = await MemoryEngine.create(tmpDir);
    expect(engine).toBe(engine2);
  });

  it("writes a file via enqueueWrite overwrite", async () => {
    const filePath = engine.resolvePath("test.md");
    await engine.enqueueWrite(filePath, "hello world", "overwrite");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("hello world");
  });

  it("appends to a file via enqueueWrite append", async () => {
    const filePath = engine.resolvePath("append.md");
    await engine.enqueueWrite(filePath, "line1\n", "overwrite");
    await engine.enqueueWrite(filePath, "line2\n", "append");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("line1\nline2\n");
  });

  it("serializes concurrent writes", async () => {
    const filePath = engine.resolvePath("concurrent.md");
    await engine.enqueueWrite(filePath, "", "overwrite");
    const writes = Array.from({ length: 10 }, (_, i) =>
      engine.enqueueWrite(filePath, `line${i}\n`, "append")
    );
    await Promise.all(writes);
    const content = await readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(10);
  });

  it("creates directories for nested paths", async () => {
    const filePath = engine.resolvePath("deep", "nested", "file.md");
    await engine.enqueueWrite(filePath, "deep content", "overwrite");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("deep content");
  });

  it("acquires and releases a lock", async () => {
    const release = await engine.acquireLock(".test.lock");
    await expect(engine.acquireLock(".test.lock")).rejects.toThrow("Lock .test.lock is held");
    await release();
    const release2 = await engine.acquireLock(".test.lock");
    await release2();
  });
});
