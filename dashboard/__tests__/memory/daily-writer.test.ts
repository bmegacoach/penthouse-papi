import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { MemoryEngine } from "../../lib/memory/engine";
import { DailyWriter } from "../../lib/memory/daily-writer";

let tmpDir: string;
let engine: MemoryEngine;
let writer: DailyWriter;

beforeEach(async () => {
  MemoryEngine.reset();
  tmpDir = join(tmpdir(), `daily-writer-test-${Date.now()}`);
  engine = await MemoryEngine.create(tmpDir);
  writer = new DailyWriter(engine);
});

afterEach(async () => {
  MemoryEngine.reset();
  await rm(tmpDir, { recursive: true, force: true });
});

describe("DailyWriter", () => {
  it("appends an entry to today's daily note", async () => {
    await writer.append("Test entry content", "claude-code");
    const content = await writer.readToday();
    expect(content).not.toBeNull();
    expect(content).toContain("Test entry content");
    expect(content).toContain("claude-code");
  });

  it("appends multiple entries preserving order", async () => {
    await writer.append("First entry", "agent-a");
    await writer.append("Second entry", "agent-b");
    const content = await writer.readToday();
    expect(content).not.toBeNull();
    const firstIdx = content!.indexOf("First entry");
    const secondIdx = content!.indexOf("Second entry");
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThanOrEqual(0);
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("creates header on first write of the day", async () => {
    await writer.append("Some content", "claude-code");
    const content = await writer.readToday();
    expect(content).not.toBeNull();
    expect(content).toContain("# Daily Notes");
  });

  it("supports tagged entries", async () => {
    await writer.append("Research needed on topic X", "claude-code", ["needs_research", "p1"]);
    const content = await writer.readToday();
    expect(content).not.toBeNull();
    expect(content).toContain("needs_research");
  });

  it("reads a specific date", async () => {
    const pastDate = new Date("2025-01-15");
    await writer.append("Past entry", "claude-code", [], pastDate);
    const content = await writer.readDate(pastDate);
    expect(content).not.toBeNull();
    expect(content).toContain("Past entry");
    expect(content).toContain("# Daily Notes — 2025-01-15");
  });
});
