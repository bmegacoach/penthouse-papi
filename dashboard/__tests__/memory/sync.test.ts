import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { SyncManager } from "@/lib/memory/sync";
import { DailyWriter } from "@/lib/memory/daily-writer";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("SyncManager", () => {
  let tmpDir: string;
  let upstreamDir: string;
  let engine: MemoryEngine;
  let sync: SyncManager;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `sync-test-${Date.now()}`);
    upstreamDir = join(tmpDir, "upstream", "memory");
    await mkdir(join(tmpDir, "downstream", "memory", "state"), { recursive: true });
    await mkdir(join(upstreamDir, "knowledge", "fleet"), { recursive: true });
    await mkdir(join(upstreamDir, "tacit"), { recursive: true });

    const configPath = join(tmpDir, "downstream", "memory", "config.json");
    await writeFile(configPath, JSON.stringify({
      tier: "business-unit",
      namespace: "test",
      rootPath: "./memory",
      sync: {
        enabled: true,
        upstream: upstreamDir,
        sharedNamespaces: ["fleet"],
        ownedNamespaces: ["content"],
      },
      autoresearch: { sources: [], schedule: "", maxConcurrent: 1 },
      consolidation: { schedule: "" },
    }), "utf-8");

    engine = await MemoryEngine.create(join(tmpDir, "downstream"));
    sync = new SyncManager(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("pulls shared namespace files from upstream", async () => {
    await writeFile(join(upstreamDir, "knowledge", "fleet", "agents.md"), "# Fleet Agents\n\nClaude, A0, OpenFang", "utf-8");

    await sync.pull();

    const pulled = await engine.readFile(engine.resolvePath("knowledge", "fleet", "agents.md"));
    expect(pulled).toContain("Fleet Agents");
  });

  it("pushes daily digest to upstream", async () => {
    const dw = new DailyWriter(engine);
    await dw.append("Built dashboard today", "claude-code");

    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    await mkdir(join(upstreamDir, "daily", year, month), { recursive: true });

    await sync.push();

    const digestPath = join(upstreamDir, "daily", year, month, `${today}.test.digest.md`);
    const content = await readFile(digestPath, "utf-8");
    expect(content).toContain("Built dashboard today");
  });

  it("skips sync when disabled", async () => {
    engine.config.sync.enabled = false;
    await sync.pull();
    await sync.push();
  });

  it("updates sync state with checksums", async () => {
    await writeFile(join(upstreamDir, "knowledge", "fleet", "agents.md"), "content", "utf-8");
    await sync.pull();

    const stateRaw = await engine.readFile(engine.resolvePath("state", "sync.json"));
    expect(stateRaw).not.toBeNull();
    const state = JSON.parse(stateRaw!);
    expect(state.files.length).toBeGreaterThan(0);
    expect(state.files[0].checksum).toBeDefined();
  });
});
