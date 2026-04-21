# 3-Layer Memory Autoresearcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable 3-layer memory engine with autoresearch, consolidation, sync, and dashboard for the Penthouse Papi business unit.

**Architecture:** File-based markdown + JSON storage with a TypeScript engine running as a singleton. Three layers (Daily Notes, Knowledge Graph, Tacit Knowledge) with namespace-scoped ownership. Background autoresearch worker queries Perplexity, YouTube, Reddit, and Ahrefs. Nightly consolidation promotes facts upward. Bidirectional sync with ChiefOS. Dashboard page at `/memory`.

**Tech Stack:** TypeScript, Next.js 16, Vitest, node:fs/promises, node:crypto (SHA-256), Perplexity REST API, YouTube Data API v3, lucide-react, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-23-3layer-memory-autoresearcher-design.md`

**Base path:** `C:/Users/Troy/Chief OS/penthouse-papi/dashboard`

---

### Task 1: Test Setup + Types + Config + Write Queue

**Files:**
- Create: `lib/memory/types.ts`
- Create: `lib/memory/config.ts`
- Create: `lib/memory/engine.ts`
- Create: `memory/config.json`
- Create: `vitest.config.ts`
- Create: `__tests__/memory/engine.test.ts`
- Modify: `package.json` (add vitest + test script)

- [ ] **Step 1: Install vitest**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard"
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create types.ts with all shared interfaces**

Create `lib/memory/types.ts` with these interfaces from the spec:
- `MemoryConfig`
- `MemoryEvent` (with the 12 event type discriminants)
- `ResearchItem` (with `retries`, `error`, `partial`, `dead` status)
- `HeartbeatState`
- `SyncFileState`
- `ConsolidationState` (last_run, files_updated, patterns_found, tacit_proposals)
- `KnowledgeEntity` (path, namespace, title, content, updated_at, source)
- `TacitRule` (path, title, content, confidence, origin_daily_note, updated_at)
- `WriteRequest` (path, content, mode: "append" | "overwrite")

```ts
// ── Memory Event Types ──────────────────────────────────────────────
export type EventType =
  | "task_start" | "task_complete" | "task_fail"
  | "decision" | "research_start" | "research_complete"
  | "blocker" | "deploy" | "error"
  | "tacit_proposal" | "needs_research" | "manual_note";

export interface MemoryEvent {
  timestamp: string;
  type: EventType;
  source: string;
  layer: "L1" | "L2" | "L3";
  namespace?: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

// ── Research ────────────────────────────────────────────────────────
export type ResearchTrigger = "tag" | "blocker" | "missing" | "scheduled" | "manual";
export type ResearchStatus = "queued" | "active" | "complete" | "failed" | "dead";
export type ResearchSource = "perplexity" | "youtube" | "reddit" | "ahrefs";

export interface ResearchItem {
  id: string;
  question: string;
  context: string;
  trigger: ResearchTrigger;
  source_hint?: ResearchSource[];
  priority: "p1" | "p2" | "p3";
  namespace: string;
  status: ResearchStatus;
  retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: {
    summary: string;
    sources: { url: string; title: string; relevance: string }[];
    knowledge_updates: string[];
    tacit_proposals: string[];
    partial: boolean;
  };
}

// ── Config ──────────────────────────────────────────────────────────
export type MemoryTier = "business-unit" | "chiefos" | "product";

export interface MemoryConfig {
  tier: MemoryTier;
  namespace: string;
  rootPath: string;
  sync: {
    enabled: boolean;
    upstream: string;
    sharedNamespaces: string[];
    ownedNamespaces: string[];
  };
  autoresearch: {
    sources: ResearchSource[];
    schedule: string;
    maxConcurrent: number;
  };
  consolidation: {
    schedule: string;
  };
}

// ── State files ─────────────────────────────────────────────────────
export interface HeartbeatState {
  last_run: string;
  stalled_tasks: { event_id: string; description: string; stalled_since: string }[];
  repeated_blockers: { pattern: string; count: number; research_created: boolean }[];
  research_queue_health: { queued: number; active: number; failed: number; dead: number };
}

export interface SyncFileState {
  path: string;
  checksum: string;
  updated_at: string;
  owner: "chiefos" | "business-unit";
  last_synced: string;
}

export interface ConsolidationState {
  last_run: string;
  files_updated: string[];
  patterns_found: string[];
  tacit_proposals: string[];
  manifest: { path: string; type: "L2" | "L3"; namespace: string }[];
}

// ── Internal ────────────────────────────────────────────────────────
export interface KnowledgeEntity {
  path: string;
  namespace: string;
  title: string;
  content: string;
  updated_at: string;
  source: "consolidation" | "autoresearch" | "manual" | "seed";
}

export interface TacitRule {
  path: string;
  title: string;
  content: string;
  confidence: number;
  origin_daily_note?: string;
  updated_at: string;
}

export interface WriteRequest {
  path: string;
  content: string;
  mode: "append" | "overwrite";
  resolve: () => void;
  reject: (err: Error) => void;
}
```

- [ ] **Step 5: Create config.ts**

Create `lib/memory/config.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryConfig } from "./types";

const DEFAULT_CONFIG: MemoryConfig = {
  tier: "business-unit",
  namespace: "penthouse-papi",
  rootPath: "./memory",
  sync: {
    enabled: true,
    upstream: "../../memory",
    sharedNamespaces: ["fleet", "infrastructure"],
    ownedNamespaces: ["content", "brands", "campaigns", "market-intel"],
  },
  autoresearch: {
    sources: ["perplexity", "youtube", "reddit", "ahrefs"],
    schedule: "0 */4 * * *",
    maxConcurrent: 2,
  },
  consolidation: {
    schedule: "0 2 * * *",
  },
};

export async function loadConfig(basePath?: string): Promise<MemoryConfig> {
  const root = basePath || process.cwd();
  const configPath = join(root, "memory", "config.json");

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MemoryConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      sync: { ...DEFAULT_CONFIG.sync, ...(parsed.sync || {}) },
      autoresearch: { ...DEFAULT_CONFIG.autoresearch, ...(parsed.autoresearch || {}) },
      consolidation: { ...DEFAULT_CONFIG.consolidation, ...(parsed.consolidation || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function resolveMemoryPath(config: MemoryConfig, ...segments: string[]): string {
  return join(config.rootPath, ...segments);
}
```

- [ ] **Step 6: Create engine.ts with write queue**

Create `lib/memory/engine.ts`:

```ts
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
      // Stale lock — overwrite
    }

    await mkdir(dirname(lockPath), { recursive: true });
    await writeFile(lockPath, lockData, "utf-8");

    return async () => {
      const { unlink } = await import("node:fs/promises");
      try { await unlink(lockPath); } catch { /* already released */ }
    };
  }
}
```

- [ ] **Step 7: Create memory/config.json**

Create `memory/config.json` at `C:/Users/Troy/Chief OS/penthouse-papi/dashboard/memory/config.json`:

```json
{
  "tier": "business-unit",
  "namespace": "penthouse-papi",
  "rootPath": "./memory",
  "sync": {
    "enabled": true,
    "upstream": "../../memory",
    "sharedNamespaces": ["fleet", "infrastructure"],
    "ownedNamespaces": ["content", "brands", "campaigns", "market-intel"]
  },
  "autoresearch": {
    "sources": ["perplexity", "youtube", "reddit", "ahrefs"],
    "schedule": "0 */4 * * *",
    "maxConcurrent": 2
  },
  "consolidation": {
    "schedule": "0 2 * * *"
  }
}
```

- [ ] **Step 8: Write engine tests**

Create `__tests__/memory/engine.test.ts`:

```ts
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
    // Second acquire should fail
    await expect(engine.acquireLock(".test.lock")).rejects.toThrow("Lock .test.lock is held");
    await release();
    // Now it should succeed
    const release2 = await engine.acquireLock(".test.lock");
    await release2();
  });
});
```

- [ ] **Step 9: Run tests**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard" && npx vitest run __tests__/memory/engine.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/memory/types.ts lib/memory/config.ts lib/memory/engine.ts memory/config.json vitest.config.ts __tests__/memory/engine.test.ts package.json package-lock.json
git commit -m "feat(memory): types, config, engine with serialized write queue + tests"
```

---

### Task 2: Daily Writer + Event Logger

**Files:**
- Create: `lib/memory/daily-writer.ts`
- Create: `lib/memory/event-logger.ts`
- Create: `__tests__/memory/daily-writer.test.ts`
- Create: `__tests__/memory/event-logger.test.ts`

- [ ] **Step 1: Write daily-writer tests**

Create `__tests__/memory/daily-writer.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { DailyWriter } from "@/lib/memory/daily-writer";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("DailyWriter", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let writer: DailyWriter;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `daily-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    writer = new DailyWriter(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("appends an entry to today's daily note", async () => {
    await writer.append("First entry from claude-code", "claude-code");
    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const notePath = engine.resolvePath("daily", year, month, `${today}.md`);
    const content = await readFile(notePath, "utf-8");
    expect(content).toContain("First entry from claude-code");
    expect(content).toContain("claude-code");
  });

  it("appends multiple entries preserving order", async () => {
    await writer.append("Entry 1", "agent-a");
    await writer.append("Entry 2", "agent-b");
    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const notePath = engine.resolvePath("daily", year, month, `${today}.md`);
    const content = await readFile(notePath, "utf-8");
    expect(content.indexOf("Entry 1")).toBeLessThan(content.indexOf("Entry 2"));
  });

  it("creates header on first write of the day", async () => {
    await writer.append("First entry", "test");
    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const notePath = engine.resolvePath("daily", year, month, `${today}.md`);
    const content = await readFile(notePath, "utf-8");
    expect(content).toMatch(/^# Daily Notes/);
  });

  it("supports tagged entries", async () => {
    await writer.append("Need to investigate X", "claude-code", ["needs_research"]);
    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const notePath = engine.resolvePath("daily", year, month, `${today}.md`);
    const content = await readFile(notePath, "utf-8");
    expect(content).toContain("needs_research");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/memory/daily-writer.test.ts
```

Expected: FAIL — `DailyWriter` not found.

- [ ] **Step 3: Implement daily-writer.ts**

Create `lib/memory/daily-writer.ts`:

```ts
import type { MemoryEngine } from "./engine";

export class DailyWriter {
  private engine: MemoryEngine;
  private initialized = new Set<string>();

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private getDateParts(date?: Date): { year: string; month: string; day: string; full: string } {
    const d = date || new Date();
    const full = d.toISOString().split("T")[0];
    const [year, month] = full.split("-");
    return { year, month, day: full.split("-")[2], full };
  }

  private getDailyPath(date?: Date): string {
    const { year, month, full } = this.getDateParts(date);
    return this.engine.resolvePath("daily", year, month, `${full}.md`);
  }

  async append(content: string, source: string, tags?: string[], date?: Date): Promise<void> {
    const notePath = this.getDailyPath(date);
    const { full } = this.getDateParts(date);
    const time = new Date().toISOString().split("T")[1].split(".")[0];

    // Create header if first write
    if (!this.initialized.has(full)) {
      const exists = await this.engine.fileExists(notePath);
      if (!exists) {
        const header = `# Daily Notes — ${full}\n\n`;
        await this.engine.enqueueWrite(notePath, header, "overwrite");
      }
      this.initialized.add(full);
    }

    const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
    const entry = `\n**${time}** (${source})${tagStr}\n${content}\n`;
    await this.engine.enqueueWrite(notePath, entry, "append");
  }

  async readToday(): Promise<string | null> {
    return this.engine.readFile(this.getDailyPath());
  }

  async readDate(date: Date): Promise<string | null> {
    return this.engine.readFile(this.getDailyPath(date));
  }
}
```

- [ ] **Step 4: Run daily-writer tests**

```bash
npx vitest run __tests__/memory/daily-writer.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Write event-logger tests**

Create `__tests__/memory/event-logger.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { EventLogger } from "@/lib/memory/event-logger";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("EventLogger", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let logger: EventLogger;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `event-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    logger = new EventLogger(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("logs an event to today's events.json", async () => {
    await logger.log({
      type: "task_start",
      source: "claude-code",
      layer: "L1",
      payload: { task: "build dashboard" },
    });

    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const eventsPath = engine.resolvePath("daily", year, month, `${today}.events.json`);
    const raw = await readFile(eventsPath, "utf-8");
    const events = JSON.parse(raw);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("task_start");
    expect(events[0].source).toBe("claude-code");
    expect(events[0].timestamp).toBeDefined();
  });

  it("appends multiple events preserving array structure", async () => {
    await logger.log({ type: "task_start", source: "a", layer: "L1", payload: {} });
    await logger.log({ type: "task_complete", source: "a", layer: "L1", payload: {} });

    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const eventsPath = engine.resolvePath("daily", year, month, `${today}.events.json`);
    const raw = await readFile(eventsPath, "utf-8");
    const events = JSON.parse(raw);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("task_start");
    expect(events[1].type).toBe("task_complete");
  });

  it("reads today's events", async () => {
    await logger.log({ type: "blocker", source: "test", layer: "L1", payload: { issue: "x" } });
    const events = await logger.readToday();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("blocker");
  });
});
```

- [ ] **Step 6: Run event-logger tests — verify fail**

```bash
npx vitest run __tests__/memory/event-logger.test.ts
```

Expected: FAIL — `EventLogger` not found.

- [ ] **Step 7: Implement event-logger.ts**

Create `lib/memory/event-logger.ts`:

```ts
import type { MemoryEngine } from "./engine";
import type { MemoryEvent, EventType } from "./types";

interface LogInput {
  type: EventType;
  source: string;
  layer: "L1" | "L2" | "L3";
  namespace?: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

export class EventLogger {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private getEventsPath(date?: Date): string {
    const d = date || new Date();
    const full = d.toISOString().split("T")[0];
    const [year, month] = full.split("-");
    return this.engine.resolvePath("daily", year, month, `${full}.events.json`);
  }

  async log(input: LogInput, date?: Date): Promise<void> {
    const eventsPath = this.getEventsPath(date);
    const event: MemoryEvent = {
      timestamp: new Date().toISOString(),
      ...input,
    };

    const existing = await this.engine.readFile(eventsPath);
    const events: MemoryEvent[] = existing ? JSON.parse(existing) : [];
    events.push(event);

    await this.engine.enqueueWrite(eventsPath, JSON.stringify(events, null, 2), "overwrite");
  }

  async readToday(): Promise<MemoryEvent[]> {
    return this.readDate(new Date());
  }

  async readDate(date: Date): Promise<MemoryEvent[]> {
    const raw = await this.engine.readFile(this.getEventsPath(date));
    return raw ? JSON.parse(raw) : [];
  }
}
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS (engine + daily-writer + event-logger).

- [ ] **Step 9: Commit**

```bash
git add lib/memory/daily-writer.ts lib/memory/event-logger.ts __tests__/memory/daily-writer.test.ts __tests__/memory/event-logger.test.ts
git commit -m "feat(memory): daily writer + event logger with tests"
```

---

### Task 3: Knowledge Manager + Tacit Manager + Seed Files

**Files:**
- Create: `lib/memory/knowledge-manager.ts`
- Create: `lib/memory/tacit-manager.ts`
- Create: `__tests__/memory/knowledge-manager.test.ts`
- Create: `__tests__/memory/tacit-manager.test.ts`
- Create: Seed files in `memory/knowledge/` and `memory/tacit/`

- [ ] **Step 1: Write knowledge-manager tests**

Create `__tests__/memory/knowledge-manager.test.ts`:

```ts
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
    await km.upsert("content", "hooks-and-patterns", "# Hooks\n\nContrarian hooks win.");
    const entity = await km.read("content", "hooks-and-patterns");
    expect(entity).not.toBeNull();
    expect(entity!.content).toContain("Contrarian hooks win");
    expect(entity!.namespace).toBe("content");
  });

  it("updates an existing entity", async () => {
    await km.upsert("content", "hooks", "v1");
    await km.upsert("content", "hooks", "v2");
    const entity = await km.read("content", "hooks");
    expect(entity!.content).toBe("v2");
  });

  it("lists entities by namespace", async () => {
    await km.upsert("brands", "gbb", "Gold");
    await km.upsert("brands", "coach", "Coach");
    await km.upsert("content", "hooks", "Hooks");
    const brands = await km.list("brands");
    expect(brands).toHaveLength(2);
    expect(brands.map(e => e.title)).toContain("gbb");
    expect(brands.map(e => e.title)).toContain("coach");
  });

  it("enforces namespace ownership — blocks writes to shared namespaces", async () => {
    // config has sharedNamespaces: ["fleet", "infrastructure"]
    await expect(km.upsert("fleet", "agents", "hacked")).rejects.toThrow("shared namespace");
  });

  it("lists all namespaces", async () => {
    await km.upsert("content", "a", "x");
    await km.upsert("brands", "b", "y");
    const ns = await km.listNamespaces();
    expect(ns).toContain("content");
    expect(ns).toContain("brands");
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run __tests__/memory/knowledge-manager.test.ts
```

- [ ] **Step 3: Implement knowledge-manager.ts**

Create `lib/memory/knowledge-manager.ts`:

```ts
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import type { MemoryEngine } from "./engine";
import type { KnowledgeEntity } from "./types";

export class KnowledgeManager {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private entityPath(namespace: string, slug: string): string {
    return this.engine.resolvePath("knowledge", namespace, `${slug}.md`);
  }

  private isShared(namespace: string): boolean {
    return this.engine.config.sync.sharedNamespaces.includes(namespace);
  }

  async upsert(namespace: string, slug: string, content: string, source: "consolidation" | "autoresearch" | "manual" | "seed" = "manual"): Promise<void> {
    if (this.isShared(namespace) && this.engine.config.tier !== "chiefos") {
      throw new Error(`Cannot write to shared namespace "${namespace}" from tier "${this.engine.config.tier}"`);
    }

    const path = this.entityPath(namespace, slug);
    const header = `---\nnamespace: ${namespace}\ntitle: ${slug}\nupdated_at: ${new Date().toISOString()}\nsource: ${source}\n---\n\n`;
    await this.engine.enqueueWrite(path, header + content, "overwrite");
  }

  async read(namespace: string, slug: string): Promise<KnowledgeEntity | null> {
    const path = this.entityPath(namespace, slug);
    const raw = await this.engine.readFile(path);
    if (!raw) return null;

    // Parse frontmatter
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    const content = fmMatch ? fmMatch[2] : raw;
    const fm = fmMatch ? fmMatch[1] : "";
    const updated = fm.match(/updated_at:\s*(.+)/)?.[1] || "";
    const src = fm.match(/source:\s*(.+)/)?.[1] || "manual";

    return {
      path,
      namespace,
      title: slug,
      content,
      updated_at: updated,
      source: src as KnowledgeEntity["source"],
    };
  }

  async list(namespace: string): Promise<KnowledgeEntity[]> {
    const dir = this.engine.resolvePath("knowledge", namespace);
    try {
      const files = await readdir(dir);
      const entities: KnowledgeEntity[] = [];
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const slug = basename(f, ".md");
        const entity = await this.read(namespace, slug);
        if (entity) entities.push(entity);
      }
      return entities;
    } catch {
      return [];
    }
  }

  async listNamespaces(): Promise<string[]> {
    const dir = this.engine.resolvePath("knowledge");
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory() && e.name !== "_archived").map(e => e.name);
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 4: Run knowledge-manager tests**

```bash
npx vitest run __tests__/memory/knowledge-manager.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Write tacit-manager tests**

Create `__tests__/memory/tacit-manager.test.ts`:

```ts
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
    tmpDir = join(os.tmpdir(), `tacit-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    tm = new TacitManager(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads a tacit rule", async () => {
    // Seed a file directly
    const path = engine.resolvePath("tacit", "content-rules.md");
    await engine.enqueueWrite(path, "---\ntitle: content-rules\nconfidence: 5\nupdated_at: 2026-03-23T00:00:00Z\n---\n\nContrarian hooks outperform by 3x.", "overwrite");

    const rule = await tm.read("content-rules");
    expect(rule).not.toBeNull();
    expect(rule!.content).toContain("Contrarian hooks");
    expect(rule!.confidence).toBe(5);
  });

  it("lists all tacit rules", async () => {
    const p1 = engine.resolvePath("tacit", "rule-a.md");
    const p2 = engine.resolvePath("tacit", "rule-b.md");
    await engine.enqueueWrite(p1, "---\ntitle: rule-a\nconfidence: 3\nupdated_at: 2026-03-23T00:00:00Z\n---\n\nRule A", "overwrite");
    await engine.enqueueWrite(p2, "---\ntitle: rule-b\nconfidence: 7\nupdated_at: 2026-03-23T00:00:00Z\n---\n\nRule B", "overwrite");

    const rules = await tm.list();
    expect(rules).toHaveLength(2);
  });

  it("blocks direct writes (only consolidation can write)", async () => {
    await expect(tm.write("new-rule", "content", 1)).rejects.toThrow("consolidation");
  });

  it("allows writes when caller is consolidation", async () => {
    await tm.write("new-rule", "Learned pattern", 3, true);
    const rule = await tm.read("new-rule");
    expect(rule).not.toBeNull();
    expect(rule!.content).toContain("Learned pattern");
  });
});
```

- [ ] **Step 6: Run tests — verify fail**

```bash
npx vitest run __tests__/memory/tacit-manager.test.ts
```

- [ ] **Step 7: Implement tacit-manager.ts**

Create `lib/memory/tacit-manager.ts`:

```ts
import { readdir } from "node:fs/promises";
import { basename } from "node:path";
import type { MemoryEngine } from "./engine";
import type { TacitRule } from "./types";

export class TacitManager {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private rulePath(slug: string): string {
    return this.engine.resolvePath("tacit", `${slug}.md`);
  }

  async read(slug: string): Promise<TacitRule | null> {
    const path = this.rulePath(slug);
    const raw = await this.engine.readFile(path);
    if (!raw) return null;

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    const content = fmMatch ? fmMatch[2] : raw;
    const fm = fmMatch ? fmMatch[1] : "";
    const confidence = parseInt(fm.match(/confidence:\s*(\d+)/)?.[1] || "0", 10);
    const updated = fm.match(/updated_at:\s*(.+)/)?.[1] || "";
    const origin = fm.match(/origin_daily_note:\s*(.+)/)?.[1];

    return { path, title: slug, content, confidence, origin_daily_note: origin, updated_at: updated };
  }

  async list(): Promise<TacitRule[]> {
    const dir = this.engine.resolvePath("tacit");
    try {
      const files = await readdir(dir);
      const rules: TacitRule[] = [];
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const slug = basename(f, ".md");
        const rule = await this.read(slug);
        if (rule) rules.push(rule);
      }
      return rules;
    } catch {
      return [];
    }
  }

  async write(slug: string, content: string, confidence: number, isConsolidation = false, originNote?: string): Promise<void> {
    if (!isConsolidation) {
      throw new Error("Tacit rules can only be written during consolidation. Use propose() for suggestions.");
    }

    const path = this.rulePath(slug);
    const header = `---\ntitle: ${slug}\nconfidence: ${confidence}\nupdated_at: ${new Date().toISOString()}${originNote ? `\norigin_daily_note: ${originNote}` : ""}\n---\n\n`;
    await this.engine.enqueueWrite(path, header + content, "overwrite");
  }
}
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 9: Create seed files**

Create these seed knowledge files in `memory/knowledge/`:

`memory/knowledge/content/hooks-and-patterns.md`:
```markdown
---
namespace: content
title: hooks-and-patterns
updated_at: 2026-03-23T00:00:00Z
source: seed
---

# Hooks & Patterns

Seed file — will be enriched by autoresearch and consolidation.
```

`memory/knowledge/brands/gbb.md`:
```markdown
---
namespace: brands
title: gbb
updated_at: 2026-03-23T00:00:00Z
source: seed
---

# Goldbackbond (GBB)

Gold-backed financial products. Target: investors, real estate professionals.
Tone: authoritative, data-driven, contrarian.
```

`memory/knowledge/brands/coachai.md`:
```markdown
---
namespace: brands
title: coachai
updated_at: 2026-03-23T00:00:00Z
source: seed
---

# CoachAI Tech Camps

AI/tech education for youth. Target: parents, educators, teens.
Tone: energetic, accessible, future-forward.
```

`memory/knowledge/brands/openchief.md`:
```markdown
---
namespace: brands
title: openchief
updated_at: 2026-03-23T00:00:00Z
source: seed
---

# OpenChief

AI agent orchestration platform. Target: developers, operators, enterprises.
Tone: technical, direct, builder-focused.
```

`memory/tacit/content-rules.md`:
```markdown
---
title: content-rules
confidence: 3
updated_at: 2026-03-23T00:00:00Z
---

Contrarian hooks outperform educational content by ~3x on engagement.
Video assets outperform static images for awareness-phase content.
Monday = video, Wednesday = image, Friday = copy performs well historically.
```

`memory/tacit/brand-voice.md`:
```markdown
---
title: brand-voice
confidence: 5
updated_at: 2026-03-23T00:00:00Z
---

GBB: authoritative, data-heavy, contrarian angles. Never hype. Always cite numbers.
CoachAI: energetic, accessible. Use analogies. Speak to parents and teens differently.
OpenChief: technical, direct, builder tone. Show, don't tell. Code examples > marketing copy.
```

Create empty research queue: `memory/research/queue.json`:
```json
[]
```

- [ ] **Step 10: Commit**

```bash
git add lib/memory/knowledge-manager.ts lib/memory/tacit-manager.ts __tests__/memory/knowledge-manager.test.ts __tests__/memory/tacit-manager.test.ts memory/knowledge/ memory/tacit/ memory/research/queue.json
git commit -m "feat(memory): knowledge + tacit managers with seed files and tests"
```

---

### Task 4: Retriever

**Files:**
- Create: `lib/memory/retriever.ts`
- Create: `__tests__/memory/retriever.test.ts`

- [ ] **Step 1: Write retriever tests**

Create `__tests__/memory/retriever.test.ts`:

```ts
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

    // Seed data
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
    // Should try L2 first, find "hooks" entity
    expect(results.results.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/memory/retriever.test.ts
```

- [ ] **Step 3: Implement retriever.ts**

Create `lib/memory/retriever.ts`:

```ts
import type { MemoryEngine } from "./engine";
import type { KnowledgeManager } from "./knowledge-manager";
import type { TacitManager } from "./tacit-manager";
import type { DailyWriter } from "./daily-writer";

interface SearchResult {
  source: string;
  content: string;
  path?: string;
}

interface SearchResponse {
  layer: "L1" | "L2" | "L3";
  results: SearchResult[];
  query: string;
}

type LayerKey = "L1" | "L2" | "L3";

const TEMPORAL_WORDS = ["yesterday", "today", "last week", "this week", "this morning", "earlier", "recent"];
const BEHAVIORAL_WORDS = ["rule", "preference", "how do we", "pattern", "always", "never", "convention", "should we"];
// Default: L2 (fact/entity queries)

export class Retriever {
  constructor(
    private engine: MemoryEngine,
    private km: KnowledgeManager,
    private tm: TacitManager,
    private dw: DailyWriter,
  ) {}

  classifyIntent(query: string): LayerKey {
    const q = query.toLowerCase();
    if (TEMPORAL_WORDS.some(w => q.includes(w))) return "L1";
    if (BEHAVIORAL_WORDS.some(w => q.includes(w))) return "L3";
    return "L2";
  }

  async search(query: string, namespace?: string): Promise<SearchResponse> {
    const primaryLayer = this.classifyIntent(query);
    const fallbackOrder: LayerKey[] =
      primaryLayer === "L1" ? ["L1", "L2", "L3"] :
      primaryLayer === "L3" ? ["L3", "L2", "L1"] :
      ["L2", "L1", "L3"];

    for (const layer of fallbackOrder) {
      const results = await this.searchLayer(layer, query, namespace);
      if (results.length > 0) {
        return { layer, results, query };
      }
    }

    return { layer: primaryLayer, results: [], query };
  }

  private async searchLayer(layer: LayerKey, query: string, namespace?: string): Promise<SearchResult[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (layer === "L1") {
      return this.searchDailyNotes(keywords);
    } else if (layer === "L2") {
      return this.searchKnowledge(keywords, namespace);
    } else {
      return this.searchTacit(keywords);
    }
  }

  private async searchDailyNotes(keywords: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    // Search last 7 days of daily notes
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const content = await this.dw.readDate(date);
      if (!content) continue;
      const lower = content.toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        const label = i === 0 ? "today" : `${i}d ago`;
        results.push({ source: `daily-notes (${label})`, content });
      }
    }
    return results;
  }

  private async searchKnowledge(keywords: string[], namespace?: string): Promise<SearchResult[]> {
    const namespaces = namespace ? [namespace] : await this.km.listNamespaces();
    const results: SearchResult[] = [];

    for (const ns of namespaces) {
      const entities = await this.km.list(ns);
      for (const entity of entities) {
        const haystack = `${entity.title} ${entity.content}`.toLowerCase();
        if (keywords.some(k => haystack.includes(k))) {
          results.push({ source: `knowledge/${ns}/${entity.title}`, content: entity.content, path: entity.path });
        }
      }
    }

    return results;
  }

  private async searchTacit(keywords: string[]): Promise<SearchResult[]> {
    const rules = await this.tm.list();
    const results: SearchResult[] = [];

    for (const rule of rules) {
      const haystack = `${rule.title} ${rule.content}`.toLowerCase();
      if (keywords.some(k => haystack.includes(k))) {
        results.push({ source: `tacit/${rule.title}`, content: rule.content, path: rule.path });
      }
    }

    return results;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/memory/retriever.ts __tests__/memory/retriever.test.ts
git commit -m "feat(memory): intent-aware retriever with keyword heuristics + fallthrough"
```

---

### Task 5: Autoresearch Queue + Worker + Sources

**Files:**
- Create: `lib/memory/autoresearch/queue.ts`
- Create: `lib/memory/autoresearch/router.ts`
- Create: `lib/memory/autoresearch/sources/perplexity.ts`
- Create: `lib/memory/autoresearch/sources/youtube.ts`
- Create: `lib/memory/autoresearch/sources/reddit.ts`
- Create: `lib/memory/autoresearch/sources/ahrefs.ts`
- Create: `lib/memory/autoresearch/synthesizer.ts`
- Create: `lib/memory/autoresearch/worker.ts`
- Create: `__tests__/memory/autoresearch/queue.test.ts`
- Create: `__tests__/memory/autoresearch/router.test.ts`
- Create: `__tests__/memory/autoresearch/worker.test.ts`

- [ ] **Step 1: Write queue tests**

Create `__tests__/memory/autoresearch/queue.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("ResearchQueue", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let queue: ResearchQueue;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `queue-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "research"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    // Seed empty queue
    await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), "[]", "overwrite");
    queue = new ResearchQueue(engine);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("adds an item to the queue", async () => {
    const id = await queue.add({
      question: "What are trending hooks on Reddit?",
      context: "content planning",
      trigger: "scheduled",
      priority: "p2",
      namespace: "content",
    });
    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(id);
    expect(items[0].status).toBe("queued");
  });

  it("claims the next item", async () => {
    await queue.add({ question: "Q1", context: "", trigger: "manual", priority: "p1", namespace: "content" });
    await queue.add({ question: "Q2", context: "", trigger: "manual", priority: "p2", namespace: "content" });
    const item = await queue.claimNext();
    expect(item).not.toBeNull();
    expect(item!.status).toBe("active");
    expect(item!.question).toBe("Q1"); // p1 first
  });

  it("marks an item complete", async () => {
    const id = await queue.add({ question: "Q", context: "", trigger: "manual", priority: "p2", namespace: "content" });
    await queue.claim(id);
    await queue.complete(id, {
      summary: "Found results",
      sources: [],
      knowledge_updates: [],
      tacit_proposals: [],
      partial: false,
    });
    const items = await queue.list();
    expect(items.find(i => i.id === id)).toBeUndefined(); // moved to completed
  });

  it("marks an item failed and increments retries", async () => {
    const id = await queue.add({ question: "Q", context: "", trigger: "manual", priority: "p2", namespace: "content" });
    await queue.claim(id);
    await queue.fail(id, "API timeout");
    const items = await queue.list();
    const item = items.find(i => i.id === id)!;
    expect(item.status).toBe("failed");
    expect(item.retries).toBe(1);
    expect(item.error).toBe("API timeout");
  });

  it("marks item dead after 3 retries", async () => {
    const id = await queue.add({ question: "Q", context: "", trigger: "manual", priority: "p2", namespace: "content" });
    // 3 failures → retries hits 3 → dead
    for (let i = 0; i < 3; i++) {
      await queue.claim(id);
      await queue.fail(id, `fail ${i + 1}`);
    }
    const items = await queue.list();
    expect(items.find(i => i.id === id)).toBeUndefined(); // moved to completed as dead
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/memory/autoresearch/queue.test.ts
```

- [ ] **Step 3: Implement queue.ts**

Create `lib/memory/autoresearch/queue.ts`:

```ts
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { MemoryEngine } from "../engine";
import type { ResearchItem, ResearchSource } from "../types";

interface AddInput {
  question: string;
  context: string;
  trigger: ResearchItem["trigger"];
  priority: ResearchItem["priority"];
  namespace: string;
  source_hint?: ResearchSource[];
}

export class ResearchQueue {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private queuePath(): string {
    return this.engine.resolvePath("research", "queue.json");
  }

  private completedDir(): string {
    return this.engine.resolvePath("research", "completed");
  }

  async list(): Promise<ResearchItem[]> {
    const raw = await this.engine.readFile(this.queuePath());
    return raw ? JSON.parse(raw) : [];
  }

  private async save(items: ResearchItem[]): Promise<void> {
    await this.engine.enqueueWrite(this.queuePath(), JSON.stringify(items, null, 2), "overwrite");
  }

  async add(input: AddInput): Promise<string> {
    const items = await this.list();
    const id = randomUUID();
    const item: ResearchItem = {
      id,
      ...input,
      status: "queued",
      retries: 0,
      created_at: new Date().toISOString(),
    };
    items.push(item);
    await this.save(items);
    return id;
  }

  async claimNext(): Promise<ResearchItem | null> {
    const items = await this.list();
    const now = Date.now();
    const priorityOrder = ["p1", "p2", "p3"];

    // Re-queue failed items whose backoff delay has elapsed
    for (const item of items) {
      if (item.status === "failed" && item.started_at) {
        const backoffMs = Math.pow(2, item.retries) * 15 * 60 * 1000;
        const failedAt = new Date(item.started_at).getTime();
        if (now - failedAt >= backoffMs) {
          item.status = "queued";
        }
      }
    }
    await this.save(items);

    const queued = items
      .filter(i => i.status === "queued")
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

    if (queued.length === 0) return null;
    return this.claim(queued[0].id);
  }

  async claim(id: string): Promise<ResearchItem | null> {
    const items = await this.list();
    const item = items.find(i => i.id === id);
    if (!item) return null;

    item.status = "active";
    item.started_at = new Date().toISOString();
    await this.save(items);
    return item;
  }

  async complete(id: string, result: ResearchItem["result"]): Promise<void> {
    const items = await this.list();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;

    const item = items[idx];
    item.status = "complete";
    item.completed_at = new Date().toISOString();
    item.result = result;

    // Move to completed
    items.splice(idx, 1);
    await this.save(items);
    await this.saveCompleted(item);
  }

  async fail(id: string, error: string): Promise<void> {
    const items = await this.list();
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.retries += 1;
    item.error = error;

    if (item.retries >= 3) {
      item.status = "dead";
      item.completed_at = new Date().toISOString();
      const idx = items.indexOf(item);
      items.splice(idx, 1);
      await this.save(items);
      await this.saveCompleted(item);
    } else {
      item.status = "failed";
      await this.save(items);
    }
  }

  private async saveCompleted(item: ResearchItem): Promise<void> {
    const filePath = this.engine.resolvePath("research", "completed", `${item.id}.json`);
    await this.engine.enqueueWrite(filePath, JSON.stringify(item, null, 2), "overwrite");
  }
}
```

- [ ] **Step 4: Run queue tests**

```bash
npx vitest run __tests__/memory/autoresearch/queue.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Write router tests**

Create `__tests__/memory/autoresearch/router.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { routeSources } from "@/lib/memory/autoresearch/router";

describe("routeSources", () => {
  it("routes market trends to perplexity + ahrefs", () => {
    const sources = routeSources("What are current gold market trends?");
    expect(sources[0]).toBe("perplexity");
    expect(sources).toContain("ahrefs");
  });

  it("routes competitor content to youtube + reddit", () => {
    const sources = routeSources("What videos are competitors posting?");
    expect(sources[0]).toBe("youtube");
    expect(sources).toContain("reddit");
  });

  it("routes SEO queries to ahrefs + perplexity", () => {
    const sources = routeSources("What keywords drive traffic to our site?");
    expect(sources[0]).toBe("ahrefs");
  });

  it("routes viral/community to reddit + youtube", () => {
    const sources = routeSources("What hooks are going viral on Reddit?");
    expect(sources[0]).toBe("reddit");
  });

  it("respects source_hint override", () => {
    const sources = routeSources("anything", ["youtube"]);
    expect(sources).toEqual(["youtube"]);
  });
});
```

- [ ] **Step 6: Run — verify fail**

```bash
npx vitest run __tests__/memory/autoresearch/router.test.ts
```

- [ ] **Step 7: Implement router.ts**

Create `lib/memory/autoresearch/router.ts`:

```ts
import type { ResearchSource } from "../types";

const ROUTE_RULES: { keywords: string[]; primary: ResearchSource; secondary?: ResearchSource }[] = [
  { keywords: ["trend", "market", "news", "economy", "price", "forecast"], primary: "perplexity", secondary: "ahrefs" },
  { keywords: ["competitor", "channel", "video", "content", "post"], primary: "youtube", secondary: "reddit" },
  { keywords: ["seo", "keyword", "traffic", "ranking", "backlink", "domain"], primary: "ahrefs", secondary: "perplexity" },
  { keywords: ["viral", "hook", "reddit", "community", "trending", "subreddit"], primary: "reddit", secondary: "youtube" },
  { keywords: ["how to", "tutorial", "guide", "documentation", "technical"], primary: "perplexity" },
];

export function routeSources(question: string, sourceHint?: ResearchSource[]): ResearchSource[] {
  if (sourceHint?.length) return sourceHint;

  const q = question.toLowerCase();

  for (const rule of ROUTE_RULES) {
    if (rule.keywords.some(k => q.includes(k))) {
      const sources: ResearchSource[] = [rule.primary];
      if (rule.secondary) sources.push(rule.secondary);
      return sources;
    }
  }

  // Default: perplexity (general purpose)
  return ["perplexity"];
}
```

- [ ] **Step 8: Run router tests**

```bash
npx vitest run __tests__/memory/autoresearch/router.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 9: Implement source clients**

Create `lib/memory/autoresearch/sources/perplexity.ts`:

```ts
const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

export interface PerplexityResult {
  answer: string;
  citations: string[];
}

export async function queryPerplexity(question: string, apiKey: string): Promise<PerplexityResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a research assistant. Provide factual, concise answers with sources." },
          { role: "user", content: question },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);

    const data = await res.json();
    return {
      answer: data.choices?.[0]?.message?.content || "",
      citations: data.citations || [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

Create `lib/memory/autoresearch/sources/youtube.ts`:

```ts
const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export interface YouTubeResult {
  videos: { title: string; videoId: string; channelTitle: string; viewCount: string; publishedAt: string }[];
}

export async function queryYouTube(query: string, apiKey: string, maxResults = 5): Promise<YouTubeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const searchParams = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      order: "viewCount",
      maxResults: String(maxResults),
      key: apiKey,
    });

    const searchRes = await fetch(`${YT_SEARCH_URL}?${searchParams}`, { signal: controller.signal });
    if (!searchRes.ok) throw new Error(`YouTube Search ${searchRes.status}: ${await searchRes.text()}`);
    const searchData = await searchRes.json();

    const videoIds = searchData.items?.map((i: any) => i.id.videoId).filter(Boolean) || [];
    if (videoIds.length === 0) return { videos: [] };

    const statsParams = new URLSearchParams({
      part: "statistics",
      id: videoIds.join(","),
      key: apiKey,
    });

    const statsRes = await fetch(`${YT_VIDEOS_URL}?${statsParams}`, { signal: controller.signal });
    if (!statsRes.ok) throw new Error(`YouTube Stats ${statsRes.status}`);
    const statsData = await statsRes.json();

    const statsMap = new Map<string, string>();
    for (const item of statsData.items || []) {
      statsMap.set(item.id, item.statistics?.viewCount || "0");
    }

    return {
      videos: searchData.items?.map((item: any) => ({
        title: item.snippet?.title || "",
        videoId: item.id?.videoId || "",
        channelTitle: item.snippet?.channelTitle || "",
        viewCount: statsMap.get(item.id?.videoId) || "0",
        publishedAt: item.snippet?.publishedAt || "",
      })) || [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

Create `lib/memory/autoresearch/sources/reddit.ts`:

```ts
export interface RedditResult {
  posts: { title: string; subreddit: string; score: number; url: string; num_comments: number }[];
}

// Mock implementation for MVP — replace with real Reddit API when OAuth is set up
export async function queryReddit(query: string, subreddits: string[] = ["entrepreneur", "realestateinvesting"]): Promise<RedditResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const posts: RedditResult["posts"] = [];

    for (const sub of subreddits.slice(0, 3)) {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=top&t=week&limit=5`,
        {
          headers: { "User-Agent": "PenthousePapi/1.0" },
          signal: controller.signal,
        }
      );

      if (!res.ok) continue;
      const data = await res.json();

      for (const child of data?.data?.children || []) {
        const d = child.data;
        posts.push({
          title: d.title,
          subreddit: d.subreddit,
          score: d.score,
          url: `https://reddit.com${d.permalink}`,
          num_comments: d.num_comments,
        });
      }
    }

    return { posts: posts.sort((a, b) => b.score - a.score).slice(0, 10) };
  } finally {
    clearTimeout(timeout);
  }
}
```

Create `lib/memory/autoresearch/sources/ahrefs.ts`:

```ts
// Ahrefs is accessed via MCP tool calls, not direct HTTP.
// This module provides a standardized interface that wraps MCP calls.
// In the dashboard context (Next.js server), MCP is not available —
// this source is skipped unless running in a Claude Code / agent context.

export interface AhrefsResult {
  available: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export async function queryAhrefs(_query: string): Promise<AhrefsResult> {
  // MCP tools are only available in agent runtime, not in Next.js server actions.
  // For now, return unavailable. The worker will skip this source gracefully.
  return {
    available: false,
    error: "Ahrefs MCP source requires agent runtime context. Skipped in server mode.",
  };
}
```

- [ ] **Step 10: Implement synthesizer.ts**

Create `lib/memory/autoresearch/synthesizer.ts`:

```ts
export interface SynthesisInput {
  question: string;
  context: string;
  sourceResults: { source: string; data: string }[];
}

export interface SynthesisOutput {
  summary: string;
  sources: { url: string; title: string; relevance: string }[];
  knowledge_updates: string[];
  tacit_proposals: string[];
}

// Uses Perplexity as the synthesis LLM (already have the API key)
export async function synthesize(input: SynthesisInput, apiKey: string): Promise<SynthesisOutput> {
  const sourceBlock = input.sourceResults
    .map(s => `### Source: ${s.source}\n${s.data}`)
    .join("\n\n");

  const prompt = `You are a research synthesizer for a content creation studio called Penthouse Papi.

Question: ${input.question}
Context: ${input.context}

Raw research data:
${sourceBlock}

Respond with a JSON object:
{
  "summary": "2-3 paragraph synthesis of findings",
  "sources": [{"url": "...", "title": "...", "relevance": "one sentence"}],
  "knowledge_updates": ["list of facts to add to the knowledge graph"],
  "tacit_proposals": ["list of behavioral rules suggested by findings, if any"]
}

Only include tacit_proposals if findings strongly suggest a repeatable pattern. Be concise.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Synthesis failed: ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Synthesis returned non-JSON response");

  return JSON.parse(jsonMatch[0]);
}
```

- [ ] **Step 11: Implement worker.ts**

Create `lib/memory/autoresearch/worker.ts`:

```ts
import type { MemoryEngine } from "../engine";
import type { ResearchItem } from "../types";
import { ResearchQueue } from "./queue";
import { routeSources } from "./router";
import { queryPerplexity } from "./sources/perplexity";
import { queryYouTube } from "./sources/youtube";
import { queryReddit } from "./sources/reddit";
import { queryAhrefs } from "./sources/ahrefs";
import { synthesize } from "./synthesizer";
import { DailyWriter } from "../daily-writer";
import { KnowledgeManager } from "../knowledge-manager";

interface WorkerConfig {
  perplexityApiKey?: string;
  youtubeApiKey?: string;
}

export class AutoresearchWorker {
  private engine: MemoryEngine;
  private queue: ResearchQueue;
  private daily: DailyWriter;
  private km: KnowledgeManager;
  private config: WorkerConfig;

  constructor(engine: MemoryEngine, config: WorkerConfig) {
    this.engine = engine;
    this.queue = new ResearchQueue(engine);
    this.daily = new DailyWriter(engine);
    this.km = new KnowledgeManager(engine);
    this.config = config;
  }

  async processNext(): Promise<ResearchItem | null> {
    const item = await this.queue.claimNext();
    if (!item) return null;

    try {
      const sources = routeSources(item.question, item.source_hint);
      const sourceResults: { source: string; data: string }[] = [];
      const failedSources: string[] = [];

      for (const source of sources) {
        try {
          const data = await this.querySource(source, item.question);
          if (data) sourceResults.push({ source, data });
        } catch (err) {
          failedSources.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (sourceResults.length === 0) {
        await this.queue.fail(item.id, `All sources failed: ${failedSources.join("; ")}`);
        return item;
      }

      // Synthesize
      if (!this.config.perplexityApiKey) {
        // Can't synthesize without API key — write raw data to daily notes
        await this.daily.append(
          `## Research Raw: ${item.question}\n\n${sourceResults.map(s => `**${s.source}:**\n${s.data}`).join("\n\n")}`,
          "autoresearcher",
          ["research_raw"],
        );
        await this.queue.fail(item.id, "No Perplexity API key for synthesis");
        return item;
      }

      const result = await synthesize(
        { question: item.question, context: item.context, sourceResults },
        this.config.perplexityApiKey,
      );

      result.partial = failedSources.length > 0;

      // Write to daily notes
      await this.daily.append(
        `## Research Complete: ${item.question}\n\n${result.summary}`,
        "autoresearcher",
        ["research_complete"],
      );

      // Update knowledge graph
      for (const update of result.knowledge_updates) {
        await this.km.upsert(item.namespace, this.slugify(item.question), update, "autoresearch");
      }

      // Log tacit proposals (don't write to L3 directly)
      for (const proposal of result.tacit_proposals) {
        await this.daily.append(
          `**Tacit Proposal:** ${proposal}`,
          "autoresearcher",
          ["tacit_proposal"],
        );
      }

      await this.queue.complete(item.id, result);
      return item;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.daily.append(
        `## Research Failed: ${item.question}\n\nError: ${msg}`,
        "autoresearcher",
        ["research_raw"],
      );
      await this.queue.fail(item.id, msg);
      return item;
    }
  }

  private async querySource(source: string, question: string): Promise<string | null> {
    switch (source) {
      case "perplexity": {
        if (!this.config.perplexityApiKey) return null;
        const r = await queryPerplexity(question, this.config.perplexityApiKey);
        return `${r.answer}\n\nCitations: ${r.citations.join(", ")}`;
      }
      case "youtube": {
        if (!this.config.youtubeApiKey) return null;
        const r = await queryYouTube(question, this.config.youtubeApiKey);
        return r.videos.map(v => `- "${v.title}" by ${v.channelTitle} (${v.viewCount} views)`).join("\n");
      }
      case "reddit": {
        const r = await queryReddit(question);
        return r.posts.map(p => `- [${p.score}] ${p.title} (r/${p.subreddit}, ${p.num_comments} comments)`).join("\n");
      }
      case "ahrefs": {
        const r = await queryAhrefs(question);
        if (!r.available) return null;
        return JSON.stringify(r.data);
      }
      default:
        return null;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }
}
```

- [ ] **Step 12: Write worker integration test**

Create `__tests__/memory/autoresearch/worker.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { AutoresearchWorker } from "@/lib/memory/autoresearch/worker";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("AutoresearchWorker", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let queue: ResearchQueue;
  let worker: AutoresearchWorker;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `worker-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "research"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), "[]", "overwrite");
    queue = new ResearchQueue(engine);
    // No API keys — tests will exercise the "no key" path
    worker = new AutoresearchWorker(engine, {});
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when queue is empty", async () => {
    const result = await worker.processNext();
    expect(result).toBeNull();
  });

  it("processes an item and handles missing API keys gracefully", async () => {
    await queue.add({
      question: "Test question",
      context: "test context",
      trigger: "manual",
      priority: "p2",
      namespace: "content",
    });

    const result = await worker.processNext();
    expect(result).not.toBeNull();
    // Without API keys, item should fail gracefully
    const items = await queue.list();
    expect(items[0].status).toBe("failed");
  });
});
```

- [ ] **Step 13: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 14: Commit**

```bash
git add lib/memory/autoresearch/ __tests__/memory/autoresearch/
git commit -m "feat(memory): autoresearch queue, worker, router, 4 sources (perplexity, youtube, reddit, ahrefs)"
```

---

### Task 6: Consolidator

**Files:**
- Create: `lib/memory/consolidator.ts`
- Create: `__tests__/memory/consolidator.test.ts`

- [ ] **Step 1: Write consolidator tests**

Create `__tests__/memory/consolidator.test.ts`:

```ts
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
    // Consolidation state should be written
    const stateRaw = await engine.readFile(engine.resolvePath("state", "consolidation.json"));
    expect(stateRaw).not.toBeNull();
  });

  it("acquires and releases lock", async () => {
    // First run should succeed
    await consolidator.run();
    // Second run should also succeed (lock released)
    await consolidator.run();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/memory/consolidator.test.ts
```

- [ ] **Step 3: Implement consolidator.ts**

Create `lib/memory/consolidator.ts`:

```ts
import type { MemoryEngine } from "./engine";
import type { DailyWriter } from "./daily-writer";
import type { EventLogger } from "./event-logger";
import type { KnowledgeManager } from "./knowledge-manager";
import type { TacitManager } from "./tacit-manager";
import type { ConsolidationState } from "./types";

export class Consolidator {
  constructor(
    private engine: MemoryEngine,
    private daily: DailyWriter,
    private events: EventLogger,
    private km: KnowledgeManager,
    private tm: TacitManager,
  ) {}

  async run(date?: Date): Promise<ConsolidationState> {
    const release = await this.engine.acquireLock(".consolidation.lock");

    try {
      const targetDate = date || new Date();
      const dailyContent = await this.daily.readDate(targetDate);
      const dayEvents = await this.events.readDate(targetDate);

      const state: ConsolidationState = {
        last_run: new Date().toISOString(),
        files_updated: [],
        patterns_found: [],
        tacit_proposals: [],
        manifest: [],
      };

      if (!dailyContent && dayEvents.length === 0) {
        await this.writeState(state);
        return state;
      }

      // Pass 1: Fact extraction
      const facts = this.extractFacts(dailyContent || "");

      // Pass 2: Entity updates — match facts to existing L2 entities by keyword overlap
      const namespaces = await this.km.listNamespaces();
      for (const ns of namespaces) {
        const entities = await this.km.list(ns);
        for (const entity of entities) {
          const slug = entity.title.toLowerCase();
          const matchingFacts = facts.filter(f => f.toLowerCase().includes(slug) || slug.split("-").some(w => w.length > 3 && f.toLowerCase().includes(w)));
          if (matchingFacts.length > 0) {
            const updated = entity.content + "\n\n## Consolidated " + targetDate.toISOString().split("T")[0] + "\n\n" + matchingFacts.join("\n");
            await this.km.upsert(ns, entity.title, updated, "consolidation");
            state.files_updated.push(entity.path);
          }
        }
      }

      if (facts.length > 0) {
        state.patterns_found.push(...facts);
      }

      // Pass 3: Pattern detection (scan events for repeated types)
      const blockerCounts = new Map<string, number>();
      for (const event of dayEvents) {
        if (event.type === "blocker") {
          const key = JSON.stringify(event.payload);
          blockerCounts.set(key, (blockerCounts.get(key) || 0) + 1);
        }
      }

      // Pass 4: Tacit proposals from patterns
      for (const [pattern, count] of blockerCounts) {
        if (count >= 3) {
          state.tacit_proposals.push(`Repeated blocker (${count}x): ${pattern}`);
        }
      }

      // Pass 5: Deduplication & archival — skipped in MVP (no entities to dedupe yet)

      // Pass 6: Index refresh — rebuild manifest (reuse namespaces from Pass 2)
      for (const ns of namespaces) {
        const entities = await this.km.list(ns);
        for (const entity of entities) {
          state.manifest.push({ path: entity.path, type: "L2", namespace: ns });
        }
      }

      const tacitRules = await this.tm.list();
      for (const rule of tacitRules) {
        state.manifest.push({ path: rule.path, type: "L3", namespace: "tacit" });
      }

      await this.writeState(state);
      return state;
    } finally {
      await release();
    }
  }

  private extractFacts(content: string): string[] {
    const facts: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      // Simple heuristic: lines with numbers, percentages, or URLs are likely facts
      if (/\d+\.?\d*%/.test(trimmed) || /\d{2,}/.test(trimmed) || /https?:\/\//.test(trimmed)) {
        if (trimmed.length > 10 && trimmed.length < 500) {
          facts.push(trimmed);
        }
      }
    }

    return facts;
  }

  private async writeState(state: ConsolidationState): Promise<void> {
    const statePath = this.engine.resolvePath("state", "consolidation.json");
    await this.engine.enqueueWrite(statePath, JSON.stringify(state, null, 2), "overwrite");
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/memory/consolidator.ts __tests__/memory/consolidator.test.ts
git commit -m "feat(memory): nightly consolidator with 6-pass pipeline + lock mechanism"
```

---

### Task 7: Heartbeat

**Files:**
- Create: `lib/memory/heartbeat.ts`
- Create: `__tests__/memory/heartbeat.test.ts`

- [ ] **Step 1: Write heartbeat tests**

Create `__tests__/memory/heartbeat.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { EventLogger } from "@/lib/memory/event-logger";
import { Heartbeat } from "@/lib/memory/heartbeat";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("Heartbeat", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let el: EventLogger;
  let heartbeat: Heartbeat;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `heartbeat-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "research"), { recursive: true });
    await mkdir(join(tmpDir, "memory", "state"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), "[]", "overwrite");
    el = new EventLogger(engine);
    const rq = new ResearchQueue(engine);
    heartbeat = new Heartbeat(engine, el, rq);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("runs on empty state without errors", async () => {
    const state = await heartbeat.run();
    expect(state.last_run).toBeDefined();
    expect(state.stalled_tasks).toEqual([]);
    expect(state.repeated_blockers).toEqual([]);
  });

  it("detects stalled tasks (task_start with no completion)", async () => {
    // Log a task_start 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await el.log({
      type: "task_start",
      source: "test-agent",
      layer: "L1",
      payload: { task: "stuck-task", description: "This task is stuck" },
    });

    // Manually backdate the event timestamp
    const eventsPath = engine.resolvePath("daily", ...getDateParts(), `${getTodayStr()}.events.json`);
    const raw = await engine.readFile(eventsPath);
    if (raw) {
      const events = JSON.parse(raw);
      events[0].timestamp = threeHoursAgo.toISOString();
      await engine.enqueueWrite(eventsPath, JSON.stringify(events, null, 2), "overwrite");
    }

    const state = await heartbeat.run();
    expect(state.stalled_tasks.length).toBeGreaterThan(0);
  });

  it("detects repeated blockers and creates research items", async () => {
    // Log the same blocker 3 times
    for (let i = 0; i < 3; i++) {
      await el.log({
        type: "blocker",
        source: "test",
        layer: "L1",
        payload: { issue: "ffmpeg codec error" },
      });
    }

    const state = await heartbeat.run();
    expect(state.repeated_blockers.length).toBeGreaterThan(0);
    expect(state.repeated_blockers[0].research_created).toBe(true);
  });

  it("reports research queue health", async () => {
    const rq = new ResearchQueue(engine);
    await rq.add({ question: "Q1", context: "", trigger: "manual", priority: "p2", namespace: "content" });

    const state = await heartbeat.run();
    expect(state.research_queue_health.queued).toBe(1);
  });
});

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateParts(): [string, string] {
  const [year, month] = getTodayStr().split("-");
  return [year, month];
}
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/memory/heartbeat.test.ts
```

- [ ] **Step 3: Implement heartbeat.ts**

Create `lib/memory/heartbeat.ts`:

```ts
import type { MemoryEngine } from "./engine";
import type { EventLogger } from "./event-logger";
import type { ResearchQueue } from "./autoresearch/queue";
import type { HeartbeatState, MemoryEvent } from "./types";

export class Heartbeat {
  constructor(
    private engine: MemoryEngine,
    private events: EventLogger,
    private researchQueue: ResearchQueue,
  ) {}

  async run(): Promise<HeartbeatState> {
    const todayEvents = await this.events.readToday();

    const state: HeartbeatState = {
      last_run: new Date().toISOString(),
      stalled_tasks: [],
      repeated_blockers: [],
      research_queue_health: { queued: 0, active: 0, failed: 0, dead: 0 },
    };

    // 1. Detect stalled tasks (task_start with no task_complete/task_fail within 2 hours)
    const taskStarts = todayEvents.filter(e => e.type === "task_start");
    const completions = new Set(
      todayEvents
        .filter(e => e.type === "task_complete" || e.type === "task_fail")
        .map(e => JSON.stringify(e.payload))
    );

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const now = Date.now();

    for (const event of taskStarts) {
      const payloadKey = JSON.stringify(event.payload);
      if (!completions.has(payloadKey)) {
        const elapsed = now - new Date(event.timestamp).getTime();
        if (elapsed > twoHoursMs) {
          state.stalled_tasks.push({
            event_id: event.timestamp,
            description: (event.payload as any).description || (event.payload as any).task || "Unknown task",
            stalled_since: event.timestamp,
          });
        }
      }
    }

    // 2. Count repeated blockers (same payload 3+ times)
    const blockerCounts = new Map<string, { count: number; events: MemoryEvent[] }>();
    for (const event of todayEvents.filter(e => e.type === "blocker")) {
      const key = JSON.stringify(event.payload);
      const existing = blockerCounts.get(key) || { count: 0, events: [] };
      existing.count++;
      existing.events.push(event);
      blockerCounts.set(key, existing);
    }

    for (const [pattern, data] of blockerCounts) {
      if (data.count >= 3) {
        // Auto-create research item
        const payload = JSON.parse(pattern);
        const question = `Investigate repeated blocker: ${payload.issue || payload.description || pattern}`;
        await this.researchQueue.add({
          question,
          context: `Blocker occurred ${data.count} times today`,
          trigger: "blocker",
          priority: "p1",
          namespace: "content",
        });

        state.repeated_blockers.push({
          pattern,
          count: data.count,
          research_created: true,
        });
      }
    }

    // 3. Research queue health
    const items = await this.researchQueue.list();
    for (const item of items) {
      if (item.status === "queued") state.research_queue_health.queued++;
      else if (item.status === "active") state.research_queue_health.active++;
      else if (item.status === "failed") state.research_queue_health.failed++;
      else if (item.status === "dead") state.research_queue_health.dead++;
    }

    // Write state
    const statePath = this.engine.resolvePath("state", "heartbeat.json");
    await this.engine.enqueueWrite(statePath, JSON.stringify(state, null, 2), "overwrite");

    return state;
  }
}
```

- [ ] **Step 4: Run heartbeat tests**

```bash
npx vitest run __tests__/memory/heartbeat.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/memory/heartbeat.ts __tests__/memory/heartbeat.test.ts
git commit -m "feat(memory): heartbeat — stalled task detection, repeated blocker → research, queue health"
```

---

### Task 8: Sync Module (renumbered from 7)

**Files:**
- Create: `lib/memory/sync.ts`
- Create: `__tests__/memory/sync.test.ts`

- [ ] **Step 1: Write sync tests**

Create `__tests__/memory/sync.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { SyncManager } from "@/lib/memory/sync";
import { rm, mkdir, writeFile } from "node:fs/promises";
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

    // Write a config that points upstream to our test dir
    const configPath = join(tmpDir, "downstream", "memory", "config.json");
    await writeFile(configPath, JSON.stringify({
      tier: "business-unit",
      namespace: "test",
      rootPath: "./memory",
      sync: {
        enabled: true,
        upstream: join(tmpDir, "upstream", "memory"),
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
    // Create upstream file
    await writeFile(join(upstreamDir, "knowledge", "fleet", "agents.md"), "# Fleet Agents\n\nClaude, A0, OpenFang", "utf-8");

    await sync.pull();

    const pulled = await engine.readFile(engine.resolvePath("knowledge", "fleet", "agents.md"));
    expect(pulled).toContain("Fleet Agents");
  });

  it("pushes daily digest to upstream", async () => {
    // Create a daily note to push
    const { DailyWriter } = await import("@/lib/memory/daily-writer");
    const dw = new DailyWriter(engine);
    await dw.append("Built dashboard today", "claude-code");

    await mkdir(join(upstreamDir, "daily", "2026", "03"), { recursive: true });
    await mkdir(join(upstreamDir, "research"), { recursive: true });
    await writeFile(join(upstreamDir, "research", "queue.json"), "[]", "utf-8");

    await sync.push();

    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const digestPath = join(upstreamDir, "daily", year, month, `${today}.test.digest.md`);
    const { readFile: rf } = await import("node:fs/promises");
    const content = await rf(digestPath, "utf-8");
    expect(content).toContain("Built dashboard today");
  });

  it("skips sync when disabled", async () => {
    engine.config.sync.enabled = false;
    await sync.pull(); // Should not throw
    await sync.push(); // Should not throw
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run __tests__/memory/sync.test.ts
```

- [ ] **Step 3: Implement sync.ts**

Create `lib/memory/sync.ts`:

```ts
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

      // Pull shared knowledge namespaces
      for (const ns of this.engine.config.sync.sharedNamespaces) {
        const upstreamDir = join(upstream, "knowledge", ns);
        await this.pullDirectory(upstreamDir, this.engine.resolvePath("knowledge", ns), ns, state);
      }

      // Pull shared tacit files
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

      // Push daily digest
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
      // Upstream directory doesn't exist yet — skip
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
      // Source file doesn't exist — skip
    }
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/memory/sync.ts __tests__/memory/sync.test.ts
git commit -m "feat(memory): bidirectional sync with checksum tracking + lock"
```

---

### Task 9: API Routes

**Files:**
- Create: `app/api/memory/daily/route.ts`
- Create: `app/api/memory/daily/append/route.ts`
- Create: `app/api/memory/knowledge/route.ts`
- Create: `app/api/memory/tacit/route.ts`
- Create: `app/api/memory/tacit/approve/route.ts`
- Create: `app/api/memory/research/route.ts`

> **Note:** API routes are internal-only (localhost) for MVP. Auth middleware (Supabase Auth JWT) is deferred to productization phase. All routes are unauthenticated in business-unit tier.

- [ ] **Step 1: Create a shared engine initializer for API routes**

Create `lib/memory/server.ts`:

```ts
import { MemoryEngine } from "./engine";
import { DailyWriter } from "./daily-writer";
import { EventLogger } from "./event-logger";
import { KnowledgeManager } from "./knowledge-manager";
import { TacitManager } from "./tacit-manager";
import { Retriever } from "./retriever";
import { ResearchQueue } from "./autoresearch/queue";

let _engine: MemoryEngine | null = null;
let _dw: DailyWriter | null = null;
let _el: EventLogger | null = null;
let _km: KnowledgeManager | null = null;
let _tm: TacitManager | null = null;
let _rq: ResearchQueue | null = null;

export async function getEngine(): Promise<MemoryEngine> {
  if (!_engine) {
    _engine = await MemoryEngine.create(process.cwd());
  }
  return _engine;
}

export async function getDailyWriter(): Promise<DailyWriter> {
  if (!_dw) _dw = new DailyWriter(await getEngine());
  return _dw;
}

export async function getEventLogger(): Promise<EventLogger> {
  if (!_el) _el = new EventLogger(await getEngine());
  return _el;
}

export async function getKnowledgeManager(): Promise<KnowledgeManager> {
  if (!_km) _km = new KnowledgeManager(await getEngine());
  return _km;
}

export async function getTacitManager(): Promise<TacitManager> {
  if (!_tm) _tm = new TacitManager(await getEngine());
  return _tm;
}

export async function getResearchQueue(): Promise<ResearchQueue> {
  if (!_rq) _rq = new ResearchQueue(await getEngine());
  return _rq;
}

export async function getRetriever(): Promise<Retriever> {
  const engine = await getEngine();
  return new Retriever(
    engine,
    new KnowledgeManager(engine),
    new TacitManager(engine),
    new DailyWriter(engine),
  );
}
```

- [ ] **Step 2: GET /api/memory/daily**

Create `app/api/memory/daily/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDailyWriter, getEventLogger } from "@/lib/memory/server";

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  const dw = await getDailyWriter();
  const el = await getEventLogger();

  const [notes, events] = await Promise.all([
    dw.readDate(date),
    el.readDate(date),
  ]);

  return NextResponse.json({ date: date.toISOString().split("T")[0], notes, events });
}
```

- [ ] **Step 3: POST /api/memory/daily/append**

Create `app/api/memory/daily/append/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDailyWriter, getEventLogger } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, source, tags, eventType, payload } = body;

  if (!content || !source) {
    return NextResponse.json({ error: "content and source required" }, { status: 400 });
  }

  const dw = await getDailyWriter();
  await dw.append(content, source, tags);

  if (eventType) {
    const el = await getEventLogger();
    await el.log({ type: eventType, source, layer: "L1", payload: payload || {}, tags });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: GET /api/memory/knowledge**

Create `app/api/memory/knowledge/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeManager } from "@/lib/memory/server";

export async function GET(req: NextRequest) {
  const namespace = req.nextUrl.searchParams.get("namespace");
  const km = await getKnowledgeManager();

  if (namespace) {
    const entities = await km.list(namespace);
    return NextResponse.json({ namespace, entities });
  }

  const namespaces = await km.listNamespaces();
  const all: Record<string, { count: number }> = {};
  for (const ns of namespaces) {
    const entities = await km.list(ns);
    all[ns] = { count: entities.length };
  }

  return NextResponse.json({ namespaces: all });
}
```

- [ ] **Step 5: GET /api/memory/tacit + POST /api/memory/tacit/approve**

Create `app/api/memory/tacit/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getTacitManager } from "@/lib/memory/server";

export async function GET() {
  const tm = await getTacitManager();
  const rules = await tm.list();
  return NextResponse.json({ rules });
}
```

Create `app/api/memory/tacit/approve/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTacitManager } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const { slug, content, confidence } = await req.json();
  if (!slug || !content) {
    return NextResponse.json({ error: "slug and content required" }, { status: 400 });
  }

  const tm = await getTacitManager();
  await tm.write(slug, content, confidence || 1, true);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: GET + POST /api/memory/research**

Create `app/api/memory/research/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getResearchQueue } from "@/lib/memory/server";

export async function GET() {
  const queue = await getResearchQueue();
  const items = await queue.list();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { question, context, priority, namespace, source_hint } = body;

  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const queue = await getResearchQueue();
  const id = await queue.add({
    question,
    context: context || "",
    trigger: "manual",
    priority: priority || "p2",
    namespace: namespace || "content",
    source_hint,
  });

  return NextResponse.json({ id });
}
```

- [ ] **Step 7: Verify API routes compile**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/memory/daily
```

Expected: 200

- [ ] **Step 8: Commit**

```bash
git add lib/memory/server.ts app/api/memory/
git commit -m "feat(memory): API routes for daily, knowledge, tacit, research"
```

---

### Task 10: Dashboard Memory Page + Sidebar Update

**Files:**
- Create: `app/memory/page.tsx`
- Create: `components/memory/layer-tabs.tsx`
- Create: `components/memory/daily-timeline.tsx`
- Create: `components/memory/knowledge-browser.tsx`
- Create: `components/memory/tacit-rules.tsx`
- Create: `components/memory/research-panel.tsx`
- Modify: `components/layout/sidebar.tsx` (add Memory nav item)

- [ ] **Step 1: Add Memory to sidebar**

In `components/layout/sidebar.tsx`, add `Brain` to imports:
```ts
import { ..., Brain } from "lucide-react";
```

Add to `navItems` array between Analytics and Manual:
```ts
{ label: "Memory", href: "/memory", icon: Brain },
```

- [ ] **Step 2: Create layer-tabs.tsx**

Create `components/memory/layer-tabs.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { FileText, Network, Shield } from "lucide-react";

const tabs = [
  { id: "L1" as const, label: "Daily Notes", icon: FileText, description: "Today's activity log" },
  { id: "L2" as const, label: "Knowledge Graph", icon: Network, description: "Durable facts & entities" },
  { id: "L3" as const, label: "Tacit Knowledge", icon: Shield, description: "Rules & patterns" },
];

interface LayerTabsProps {
  active: "L1" | "L2" | "L3";
  onChange: (layer: "L1" | "L2" | "L3") => void;
}

export function LayerTabs({ active, onChange }: LayerTabsProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-pp-border bg-pp-surface p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            active === tab.id
              ? "bg-pp-purple/10 text-pp-purple glow-purple"
              : "text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text"
          )}
        >
          <tab.icon className="h-4 w-4" />
          <div className="text-left">
            <div className="text-xs font-semibold">{tab.label}</div>
            <div className="text-[10px] opacity-60">{tab.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create daily-timeline.tsx**

Create `components/memory/daily-timeline.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { MemoryEvent } from "@/lib/memory/types";

interface DailyData {
  date: string;
  notes: string | null;
  events: MemoryEvent[];
}

export function DailyTimeline() {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory/daily")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;
  }

  if (!data?.notes && (!data?.events || data.events.length === 0)) {
    return (
      <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center grid-pattern rounded-lg p-12">
          <p className="text-sm font-medium text-pp-muted">
            No activity today yet. Daily notes will appear here as agents work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Events timeline */}
      {data?.events && data.events.length > 0 && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-pp-text">Events</h3>
          <div className="space-y-2">
            {data.events.map((event, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-pp-surface-raised">
                <div className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  event.type === "task_complete" && "bg-pp-success",
                  event.type === "task_fail" && "bg-pp-error",
                  event.type === "blocker" && "bg-pp-warning",
                  event.type === "needs_research" && "bg-pp-purple",
                  !["task_complete", "task_fail", "blocker", "needs_research"].includes(event.type) && "bg-pp-muted"
                )} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-pp-text">{event.type}</span>
                    <span className="text-[10px] text-pp-muted">{event.source}</span>
                    <span className="text-[10px] text-pp-muted">{event.timestamp.split("T")[1]?.split(".")[0]}</span>
                  </div>
                  {event.tags && event.tags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {event.tags.map(tag => (
                        <span key={tag} className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                          tag === "needs_research" && "bg-pp-purple/15 text-pp-purple",
                          tag === "tacit_proposal" && "bg-pp-gold-dim text-pp-gold",
                          !["needs_research", "tacit_proposal"].includes(tag) && "bg-pp-border text-pp-muted"
                        )}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw notes */}
      {data?.notes && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-pp-text">Daily Notes</h3>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">
            {data.notes}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create knowledge-browser.tsx**

Create `components/memory/knowledge-browser.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Folder, FileText, Lock } from "lucide-react";

interface NamespaceData {
  namespaces: Record<string, { count: number }>;
}

interface EntityData {
  namespace: string;
  entities: { title: string; content: string; updated_at: string; source: string }[];
}

export function KnowledgeBrowser() {
  const [namespaces, setNamespaces] = useState<NamespaceData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(true);

  const sharedNamespaces = ["fleet", "infrastructure"];

  useEffect(() => {
    fetch("/api/memory/knowledge")
      .then(r => r.json())
      .then(setNamespaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setEntities(null); return; }
    fetch(`/api/memory/knowledge?namespace=${selected}`)
      .then(r => r.json())
      .then(setEntities);
  }, [selected]);

  if (loading) {
    return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Namespace list */}
      <div className="rounded-xl border border-pp-border bg-pp-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-pp-text">Namespaces</h3>
        <div className="space-y-1">
          {namespaces && Object.entries(namespaces.namespaces).map(([ns, info]) => (
            <button
              key={ns}
              onClick={() => setSelected(ns)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
                selected === ns
                  ? "bg-pp-purple/10 text-pp-purple"
                  : "text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text"
              )}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="flex-1 font-medium">{ns}</span>
              {sharedNamespaces.includes(ns) && <Lock className="h-3 w-3 text-pp-muted/50" />}
              <span className="text-[10px] opacity-50">{info.count}</span>
            </button>
          ))}
          {(!namespaces || Object.keys(namespaces.namespaces).length === 0) && (
            <p className="text-xs text-pp-muted px-3 py-2">No knowledge entities yet</p>
          )}
        </div>
      </div>

      {/* Entity list */}
      <div className="lg:col-span-2 rounded-xl border border-pp-border bg-pp-surface p-4">
        {entities ? (
          <>
            <h3 className="mb-3 text-sm font-semibold text-pp-text">
              {entities.namespace}/
            </h3>
            <div className="space-y-2">
              {entities.entities.map((entity) => (
                <div key={entity.title} className="rounded-lg border border-pp-border/50 p-4 hover:bg-pp-surface-raised transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3.5 w-3.5 text-pp-purple" />
                    <span className="text-xs font-semibold text-pp-text">{entity.title}</span>
                    <span className="rounded bg-pp-border/50 px-1.5 py-0.5 text-[10px] text-pp-muted">{entity.source}</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">{entity.content}</pre>
                  <div className="mt-2 text-[10px] text-pp-muted/50">
                    Updated: {entity.updated_at?.split("T")[0] || "unknown"}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-pp-muted">Select a namespace to browse entities</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create tacit-rules.tsx**

Create `components/memory/tacit-rules.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Shield, TrendingUp } from "lucide-react";
import type { TacitRule } from "@/lib/memory/types";

export function TacitRules() {
  const [rules, setRules] = useState<TacitRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory/tacit")
      .then(r => r.json())
      .then(data => setRules(data.rules || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center grid-pattern rounded-lg p-12">
          <Shield className="h-8 w-8 text-pp-muted/40" />
          <p className="text-sm font-medium text-pp-muted">
            No tacit rules yet. Rules emerge from pattern detection during nightly consolidation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.title} className="rounded-xl border border-pp-border bg-pp-surface p-5 transition-all hover:border-pp-purple/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-pp-purple" />
            <span className="text-sm font-semibold text-pp-text">{rule.title}</span>
            <div className="flex items-center gap-1 rounded bg-pp-purple/10 px-2 py-0.5">
              <TrendingUp className="h-3 w-3 text-pp-purple" />
              <span className="text-[10px] font-bold text-pp-purple">
                {rule.confidence}x confirmed
              </span>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">{rule.content}</pre>
          <div className="mt-3 text-[10px] text-pp-muted/50">
            Updated: {rule.updated_at?.split("T")[0] || "unknown"}
            {rule.origin_daily_note && ` | Origin: ${rule.origin_daily_note}`}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create research-panel.tsx**

Create `components/memory/research-panel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Loader2, CheckCircle2, AlertCircle, Skull, Plus } from "lucide-react";
import type { ResearchItem } from "@/lib/memory/types";

const statusIcons = {
  queued: Search,
  active: Loader2,
  complete: CheckCircle2,
  failed: AlertCircle,
  dead: Skull,
};

const statusColors = {
  queued: "#94A3B8",
  active: "#6C63FF",
  complete: "#22C55E",
  failed: "#F59E0B",
  dead: "#EF4444",
};

export function ResearchPanel() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    fetch("/api/memory/research")
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    await fetch("/api/memory/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setQuestion("");
    setShowAdd(false);
    setSubmitting(false);
    refresh();
  };

  const counts = {
    active: items.filter(i => i.status === "active").length,
    queued: items.filter(i => i.status === "queued").length,
    failed: items.filter(i => i.status === "failed" || i.status === "dead").length,
  };

  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-pp-text">Research Queue</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-md bg-pp-purple/10 px-2 py-1 text-[10px] font-bold text-pp-purple hover:bg-pp-purple/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-3 text-[10px]">
        <span className="text-pp-purple font-bold">{counts.active} active</span>
        <span className="text-pp-muted">{counts.queued} queued</span>
        {counts.failed > 0 && <span className="text-pp-error">{counts.failed} failed</span>}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 space-y-2 rounded-lg border border-pp-border/50 p-3">
          <input
            type="text"
            placeholder="Research question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/40 focus:border-pp-purple/50 focus:outline-none"
            autoFocus
          />
          <button
            onClick={submit}
            disabled={submitting || !question.trim()}
            className="w-full rounded-lg bg-pp-purple py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Research"}
          </button>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-pp-muted py-4 text-center">No research items in queue</p>
        ) : (
          items.map((item) => {
            const Icon = statusIcons[item.status] || Search;
            const color = statusColors[item.status] || "#94A3B8";
            return (
              <div key={item.id} className="rounded-lg border border-pp-border/50 p-3 hover:bg-pp-surface-raised transition-colors">
                <div className="flex items-start gap-2">
                  <Icon
                    className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", item.status === "active" && "animate-spin")}
                    style={{ color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-pp-text truncate">{item.question}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-pp-muted">
                      <span style={{ color }} className="font-bold">{item.status}</span>
                      <span>{item.priority}</span>
                      {item.retries > 0 && <span>retry {item.retries}/3</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create memory page**

Create `app/memory/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { LayerTabs } from "@/components/memory/layer-tabs";
import { DailyTimeline } from "@/components/memory/daily-timeline";
import { KnowledgeBrowser } from "@/components/memory/knowledge-browser";
import { TacitRules } from "@/components/memory/tacit-rules";
import { ResearchPanel } from "@/components/memory/research-panel";

export default function MemoryPage() {
  const [activeLayer, setActiveLayer] = useState<"L1" | "L2" | "L3">("L1");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">
          Memory
        </h1>
        <p className="mt-1 text-sm text-pp-muted">
          3-layer memory system — daily notes, knowledge graph, tacit rules
        </p>
      </div>

      <div className="fade-up fade-up-2">
        <LayerTabs active={activeLayer} onChange={setActiveLayer} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main content area */}
        <div className="lg:col-span-3 fade-up fade-up-3">
          {activeLayer === "L1" && <DailyTimeline />}
          {activeLayer === "L2" && <KnowledgeBrowser />}
          {activeLayer === "L3" && <TacitRules />}
        </div>

        {/* Research panel (always visible) */}
        <div className="lg:col-span-1 fade-up fade-up-4">
          <ResearchPanel />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/memory
```

Expected: 200

- [ ] **Step 9: Commit**

```bash
git add app/memory/ components/memory/ components/layout/sidebar.tsx
git commit -m "feat(memory): dashboard /memory page with L1/L2/L3 views + research panel"
```

---

### Task 11: Integration Test + Final Verification

**Files:**
- Create: `__tests__/memory/integration.test.ts`

- [ ] **Step 1: Write end-to-end integration test**

Create `__tests__/memory/integration.test.ts`:

```ts
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

    // 6. Retrieve — temporal query hits L1
    const r1 = await retriever.search("what did we do today");
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
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Run the full build**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard" && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add __tests__/memory/integration.test.ts
git commit -m "test(memory): full lifecycle integration test — write, log, research, consolidate, retrieve"
```

- [ ] **Step 5: Final commit — verify no unstaged files**

```bash
git status
# If any remaining unstaged memory-related files, add them explicitly:
# git add lib/memory/ __tests__/memory/ app/memory/ app/api/memory/ components/memory/ memory/
git commit -m "feat: 3-layer memory autoresearcher engine — complete MVP

Portable memory engine with Daily Notes (L1), Knowledge Graph (L2),
and Tacit Knowledge (L3). Autoresearch pipeline with Perplexity,
YouTube, Reddit, and Ahrefs sources. Nightly consolidation with
6-pass promotion. Namespace-scoped sync with ChiefOS. Dashboard
/memory page with layer views and research queue. Productization-ready."
```
