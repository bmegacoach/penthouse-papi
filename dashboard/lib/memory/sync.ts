import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import type { MemoryEngine } from "./engine";
import type { SyncFileState } from "./types";

interface SyncState {
  last_sync: string;
  files: SyncFileState[];
}

export class SyncManager {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private statePath(): string {
    return this.engine.resolvePath("state", "sync.json");
  }

  private checksum(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  async pull(): Promise<void> {
    if (!this.engine.config.sync.enabled) return;

    const release = await this.engine.acquireLock(".sync.lock");
    try {
      const upstream = this.engine.config.sync.upstream;
      const state: SyncState = { last_sync: new Date().toISOString(), files: [] };

      for (const ns of this.engine.config.sync.sharedNamespaces) {
        const upstreamDir = join(upstream, "knowledge", ns);
        await this.pullDirectory(upstreamDir, this.engine.resolvePath("knowledge", ns), ns, state);
      }

      const sharedTacitFiles = ["fleet-rules.md", "security-rules.md"];
      for (const file of sharedTacitFiles) {
        const upstreamPath = join(upstream, "tacit", file);
        const localPath = this.engine.resolvePath("tacit", file);
        await this.pullFile(upstreamPath, localPath, file, state);
      }

      await this.engine.enqueueWrite(this.statePath(), JSON.stringify(state, null, 2), "overwrite");
    } finally {
      await release();
    }
  }

  async push(): Promise<void> {
    if (!this.engine.config.sync.enabled) return;

    const release = await this.engine.acquireLock(".sync.lock");
    try {
      const upstream = this.engine.config.sync.upstream;
      const ns = this.engine.config.namespace;
      const today = new Date().toISOString().split("T")[0];
      const [year, month] = today.split("-");

      const { DailyWriter } = await import("./daily-writer");
      const dw = new DailyWriter(this.engine);
      const dailyContent = await dw.readToday();

      if (dailyContent) {
        const digestPath = join(upstream, "daily", year, month, `${today}.${ns}.digest.md`);
        await mkdir(dirname(digestPath), { recursive: true });
        await writeFile(digestPath, dailyContent, "utf-8");
      }
    } finally {
      await release();
    }
  }

  private async pullDirectory(srcDir: string, destDir: string, namespace: string, state: SyncState): Promise<void> {
    try {
      const files = await readdir(srcDir);
      await mkdir(destDir, { recursive: true });

      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const srcPath = join(srcDir, file);
        const destPath = join(destDir, file);
        await this.pullFile(srcPath, destPath, `knowledge/${namespace}/${file}`, state);
      }
    } catch {
      // Upstream directory doesn't exist yet
    }
  }

  private async pullFile(srcPath: string, destPath: string, label: string, state: SyncState): Promise<void> {
    try {
      const content = await readFile(srcPath, "utf-8");
      const hash = this.checksum(content);

      await this.engine.enqueueWrite(destPath, content, "overwrite");

      state.files.push({
        path: label,
        checksum: hash,
        updated_at: new Date().toISOString(),
        owner: "chiefos",
        last_synced: new Date().toISOString(),
      });
    } catch {
      // Source file doesn't exist
    }
  }
}
