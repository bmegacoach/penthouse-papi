import { mkdir, writeFile, appendFile, readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { MemoryConfig, WriteRequest } from "./types";
import { loadConfig } from "./config";

export class MemoryEngine {
  private static instance: MemoryEngine | null = null;
  private queue: WriteRequest[] = [];
  private processing = false;
  config: MemoryConfig;
  basePath: string;

  private constructor(config: MemoryConfig, basePath: string) {
    this.config = config;
    this.basePath = basePath;
  }

  static async create(basePath?: string): Promise<MemoryEngine> {
    if (MemoryEngine.instance) return MemoryEngine.instance;
    const bp = basePath || process.cwd();
    const config = await loadConfig(bp);
    const engine = new MemoryEngine(config, bp);
    MemoryEngine.instance = engine;
    return engine;
  }

  static reset(): void {
    MemoryEngine.instance = null;
  }

  resolvePath(...segments: string[]): string {
    return join(this.basePath, this.config.rootPath, ...segments);
  }

  async enqueueWrite(path: string, content: string, mode: "append" | "overwrite"): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ path, content, mode, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const req = this.queue.shift()!;
      try {
        await mkdir(dirname(req.path), { recursive: true });
        if (req.mode === "append") {
          await appendFile(req.path, req.content, "utf-8");
        } else {
          await writeFile(req.path, req.content, "utf-8");
        }
        req.resolve();
      } catch (err) {
        req.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    this.processing = false;
  }

  async readFile(path: string): Promise<string | null> {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return null;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async acquireLock(lockName: string, timeoutMs = 600_000): Promise<() => Promise<void>> {
    const lockPath = this.resolvePath("state", lockName);
    const lockData = JSON.stringify({ acquired: new Date().toISOString(), pid: process.pid });

    // Check for stale lock
    const existing = await this.readFile(lockPath);
    if (existing) {
      const parsed = JSON.parse(existing);
      const age = Date.now() - new Date(parsed.acquired).getTime();
      if (age < timeoutMs) {
        throw new Error(`Lock ${lockName} is held (age: ${Math.round(age / 1000)}s)`);
      }
    }

    await mkdir(dirname(lockPath), { recursive: true });
    await writeFile(lockPath, lockData, "utf-8");

    return async () => {
      const { unlink } = await import("node:fs/promises");
      try { await unlink(lockPath); } catch { /* already released */ }
    };
  }
}
