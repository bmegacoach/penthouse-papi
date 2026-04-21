# 3-Layer Memory Autoresearcher — Penthouse Papi Business Unit

**Date:** 2026-03-23
**Status:** Draft
**Owner:** Troy (ChiefOS)
**Tier:** Business Unit (Penthouse Papi)

---

## 1. Overview

A persistent, layered memory and background research engine for the Penthouse Papi business unit. The system captures daily operational activity, consolidates durable knowledge, stores tacit operating patterns, and runs autoresearch loops that continuously enrich memory without human prompting.

The memory engine is a portable TypeScript module that runs identically at three tiers:

| Tier | Scope | Sync | Example |
|---|---|---|---|
| **ChiefOS** | All projects, all agents | Aggregates from business units | `C:\Users\Troy\Chief OS\memory\` |
| **Business Unit** | One project's domain | Bidirectional with ChiefOS | `penthouse-papi/memory/` |
| **Productized** | Standalone customer instance | None (or optional cloud) | Shipped app |

The difference between tiers is configuration only. When productized, sync drops off and the system self-evolves independently.

---

## 2. Three Memory Layers

### Layer 1: Daily Notes

Append-only operational log for each day. Captures tasks, decisions, blockers, experiments, errors, research breadcrumbs, and agent activity.

- One markdown file per day + paired JSON event file
- Append-only during the active day (no edits to past entries)
- Raw source material for consolidation and autoresearch

```
memory/daily/2026/03/2026-03-23.md
memory/daily/2026/03/2026-03-23.events.json
```

### Layer 2: Knowledge Graph

Durable, structured facts about the business unit's domain: content strategy, brands, campaigns, competitors, market intelligence, and shared fleet/infrastructure knowledge.

- Entity-based markdown files organized by namespace
- Updated through consolidation or autoresearch, not raw session logging
- Primary retrieval source for "what is true?" questions

```
memory/knowledge/content/hooks-and-patterns.md
memory/knowledge/brands/gbb.md
memory/knowledge/fleet/agents.md          # SHARED — synced from ChiefOS
```

### Layer 3: Tacit Knowledge

Behavioral rules, preferences, patterns, conventions, anti-patterns, and lessons learned. What makes the system behave like a working twin rather than a generic assistant.

- Small set of curated files, slow-moving and high-value
- Updated only through consolidation with operator review
- Direct writes blocked except during consolidation promotion

```
memory/tacit/content-rules.md
memory/tacit/brand-voice.md
memory/tacit/fleet-rules.md               # SHARED — synced from ChiefOS
```

---

## 3. Namespace Ownership

Each file in L2/L3 is either OWNED (business unit is source of truth) or SHARED (ChiefOS is source of truth).

| Namespace | Owner | Sync Direction |
|---|---|---|
| `content/` | Penthouse Papi | PP → ChiefOS (read-only digest) |
| `brands/` | Penthouse Papi | PP → ChiefOS (read-only digest) |
| `campaigns/` | Penthouse Papi | PP → ChiefOS (read-only digest) |
| `market-intel/` | Penthouse Papi | PP → ChiefOS (read-only digest) |
| `fleet/` | ChiefOS | ChiefOS → PP (pull-down) |
| `infrastructure/` | ChiefOS | ChiefOS → PP (pull-down) |

**Rules:**
- OWNED files: business unit reads and writes. ChiefOS can read but never write.
- SHARED files: ChiefOS reads and writes. Business unit can read but never write directly.
- On productization fork: SHARED files become OWNED snapshots that the product's consolidator can evolve.

---

## 4. File Structure

```
penthouse-papi/
  memory/
    config.json                        # runtime config data (tier, sync, sources)

    daily/
      2026/03/
        2026-03-23.md
        2026-03-23.events.json

    knowledge/
      content/
        hooks-and-patterns.md
        top-performing-themes.md
        competitor-channels.md
      brands/
        gbb.md
        coachai.md
        openchief.md
      campaigns/
        active-campaigns.md
      market-intel/
        real-estate-trends.md
        gold-market.md
        tech-education.md
      fleet/                           # SHARED
        agents.md
        dispatch-patterns.md
      infrastructure/                  # SHARED
        supabase.md
        openfang.md

    tacit/
      content-rules.md
      brand-voice.md
      scheduling-patterns.md
      fleet-rules.md                   # SHARED
      security-rules.md                # SHARED

    research/
      queue.json
      active/
      completed/

    state/
      heartbeat.json
      consolidation.json
      autoresearch.json
      sync.json
```

---

## 5. Autoresearcher Pipeline

### Triggers

| Trigger | Source | Example |
|---|---|---|
| `needs_research` tag | Daily notes | "Need to understand TikTok Shop integration for GBB" |
| Repeated blocker | Heartbeat detects same issue 3+ times | "ffmpeg codec error keeps recurring" |
| Missing knowledge | Consolidator finds empty/stale L2 entity | `competitor-channels.md` has no data |
| Scheduled scan | Cron (every 4h) | "What's trending in r/realestateinvesting today?" |
| Manual request | Operator or ChiefPM | `/research "gold price impact on content engagement"` |

### Source Routing

| Question Type | Primary Source | Secondary |
|---|---|---|
| Market trends / news | Perplexity | Ahrefs |
| Competitor content | YouTube API | Reddit |
| SEO / traffic | Ahrefs | Perplexity |
| Viral hooks / community | Reddit | YouTube API |
| Technical / how-to | Perplexity | — |

### Research Item Schema

```ts
interface ResearchItem {
  id: string;
  question: string;
  context: string;
  trigger: "tag" | "blocker" | "missing" | "scheduled" | "manual";
  source_hint?: string[];
  priority: "p1" | "p2" | "p3";
  namespace: string;
  status: "queued" | "active" | "complete" | "failed" | "dead";
  retries: number;             // incremented on each failure, max 3
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;              // last failure reason
  result?: {
    summary: string;
    sources: { url: string; title: string; relevance: string }[];
    knowledge_updates: string[];
    tacit_proposals: string[];
    partial: boolean;          // true if some sources failed
  };
}
```

### Error Handling

- Each source call has a **30-second timeout**. On timeout or HTTP error, the source is skipped and the item continues with remaining sources.
- If all sources fail, the item status becomes `"failed"` and `retries` increments.
- Failed items are retried on the next autoresearch cycle with exponential backoff: `delay = 2^retries * 15 minutes`.
- After 3 retries, status becomes `"dead"` — moved to `research/completed/` with the error preserved. Dead items are not retried unless manually re-queued.
- If some sources succeed but others fail, the result is written with `partial: true` and the item completes normally. The missing sources are noted in `error`.
- If the LLM synthesis step fails after sources succeed, raw source data is preserved in the daily note as a `research_raw` tagged entry. The item is marked `"failed"` and retried.

### Lifecycle

```
Trigger detected → queue.json → worker picks up → queries sources →
LLM synthesizes findings → writes to daily notes + updates knowledge graph →
marks complete → moves to research/completed/
```

### Write Permissions

- Autoresearcher CAN write directly to L1 (daily notes) and L2 (knowledge graph).
- Autoresearcher CANNOT write directly to L3 (tacit knowledge). L3 changes are always proposals — written to daily notes tagged `tacit_proposal` and only promoted during consolidation with operator review.

### Concurrency & File Safety

All file writes go through the `MemoryEngine` singleton which serializes access using an async write queue. Concurrent callers (multiple autoresearch workers, heartbeat, manual appends) submit writes to the queue; the engine processes them sequentially. This prevents interleaved appends and read-during-write corruption.

Implementation:
- `engine.ts` exposes `enqueueWrite(path, content, mode: "append" | "overwrite")` which returns a promise resolved after the write completes.
- All modules (`daily-writer`, `knowledge-manager`, `autoresearch/worker`, `consolidator`) use `enqueueWrite` — never direct `fs.writeFile`.
- The consolidator acquires an exclusive lock (via `memory/state/.consolidation.lock` file) before its 6-pass run. Other writers are paused until the lock releases. Lock auto-expires after 10 minutes to prevent deadlocks.
- The sync module acquires the same lock mechanism (`.sync.lock`) to prevent concurrent sync + consolidation.

### Event Schema

The `events.json` file is a JSON array of `MemoryEvent` objects:

```ts
interface MemoryEvent {
  timestamp: string;           // ISO 8601
  type: "task_start" | "task_complete" | "task_fail" | "decision" | "research_start"
      | "research_complete" | "blocker" | "deploy" | "error" | "tacit_proposal"
      | "needs_research" | "manual_note";
  source: string;              // agent ID: "claude-code", "a0-desktop", "operator", etc.
  layer: "L1" | "L2" | "L3";  // which layer this event affects
  namespace?: string;          // L2 namespace if applicable
  payload: Record<string, unknown>;  // event-specific data
  tags?: string[];             // searchable tags: "needs_research", "tacit_proposal", etc.
}
```

### Heartbeat

The heartbeat runs every 15 minutes during active hours (8 AM - 10 PM). It reads today's daily notes and events to:

1. Detect tasks with `task_start` but no `task_complete` or `task_fail` within 2 hours → flag as stalled.
2. Count `blocker` events with the same payload pattern 3+ times → auto-create a `needs_research` item.
3. Check autoresearch queue health → alert if more than 5 items are in `"failed"` status.
4. Write a heartbeat summary to `memory/state/heartbeat.json`:

```ts
interface HeartbeatState {
  last_run: string;
  stalled_tasks: { event_id: string; description: string; stalled_since: string }[];
  repeated_blockers: { pattern: string; count: number; research_created: boolean }[];
  research_queue_health: { queued: number; active: number; failed: number; dead: number };
}
```

---

## 6. Nightly Consolidation

Runs at 2 AM. Six passes over the day's L1 content:

1. **Fact extraction** — pull concrete facts (numbers, URLs, decisions, outcomes) from daily notes.
2. **Entity updates** — match facts to L2 knowledge files, update or create entities.
3. **Pattern detection** — scan last 7 days of daily notes for recurring themes.
4. **Tacit proposals** — patterns recurring 3+ times get proposed as L3 rules, written to daily notes as `tacit_proposal`.
5. **Deduplication & archival** — merge duplicate L2 entities. Entities not referenced by any daily note, research item, or other L2 file in the last 30 days are moved to `memory/knowledge/_archived/` (soft archive, recoverable). Never hard-delete.
6. **Index refresh** — rebuild `memory/state/consolidation.json` with last-run stats and a manifest of all L2/L3 files.

---

## 7. Sync: Business Unit ↔ ChiefOS

Runs after consolidation completes. Namespace-scoped, bidirectional.

### Pull (ChiefOS → Penthouse Papi)

- `ChiefOS memory/knowledge/fleet/*` → `PP memory/knowledge/fleet/*`
- `ChiefOS memory/knowledge/infrastructure/*` → `PP memory/knowledge/infrastructure/*`
- `ChiefOS memory/tacit/fleet-rules.md` → `PP memory/tacit/fleet-rules.md`
- `ChiefOS memory/tacit/security-rules.md` → `PP memory/tacit/security-rules.md`

### Push (Penthouse Papi → ChiefOS)

- PP daily note summary → ChiefOS `memory/daily/` as business-unit digest
- PP autoresearch findings tagged `cross-project` → ChiefOS research queue

### Conflict Resolution

OWNED files should never have write conflicts because only one side can write. SHARED files are always overwritten from ChiefOS (the owner) during pull — the business unit never writes to shared namespaces.

Sync state tracks per-file metadata in `memory/state/sync.json`:

```ts
interface SyncFileState {
  path: string;
  checksum: string;          // SHA-256 of file content
  updated_at: string;        // ISO 8601 from the owner's last write
  owner: "chiefos" | "business-unit";
  last_synced: string;
}
```

If a checksum mismatch is detected on a SHARED file (someone manually edited it in the business unit), the sync overwrites it from ChiefOS and logs a warning to the daily note.

### Push Digest Format

Daily note summaries pushed to ChiefOS use a namespaced filename to avoid collision with ChiefOS's own daily notes:

```
ChiefOS memory/daily/2026/03/2026-03-23.penthouse-papi.digest.md
```

Cross-project research findings are pushed as new items to `ChiefOS memory/research/queue.json` with `source: "penthouse-papi"`.

### Productization Fork

When `tier: "product"`:
- Sync disabled entirely
- Former SHARED files become OWNED — product's consolidator can evolve them
- Autoresearcher runs independently with its own source configs
- No data flows back to ChiefOS

---

## 8. Engine Configuration

```ts
interface MemoryConfig {
  tier: "business-unit" | "chiefos" | "product";
  namespace: string;
  rootPath: string;
  sync: {
    enabled: boolean;
    upstream: string;
    sharedNamespaces: string[];
    ownedNamespaces: string[];
  };
  autoresearch: {
    sources: ("perplexity" | "youtube" | "reddit" | "ahrefs")[];
    schedule: string;       // cron expression
    maxConcurrent: number;
  };
  consolidation: {
    schedule: string;       // cron expression
  };
}
```

Penthouse Papi default:

```ts
{
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
}
```

---

## 9. Retrieval Model

The retriever routes questions to the correct layer based on intent:

| Intent | Layer | Example |
|---|---|---|
| "What happened?" | L1 Daily Notes | "What did we post yesterday?" |
| "What is true?" | L2 Knowledge Graph | "What are GBB's top-performing hooks?" |
| "How do we do it?" | L3 Tacit Knowledge | "What's our rule for contrarian content frequency?" |

**Intent classification:** Keyword heuristics, not LLM. The retriever matches query keywords against a static ruleset:
- Temporal words ("yesterday", "today", "last week") → L1
- Entity/fact words ("what is", "how many", "endpoint", "API") → L2
- Behavioral words ("rule", "preference", "how do we", "pattern", "always/never") → L3
- Ambiguous queries search L2 first, then L1, then L3

**Search mechanism:** Keyword search over markdown files using file-system glob + string matching. No vector store or embeddings in MVP. Future versions may add optional vector indexing.

Retrieval priority:
1. Namespace/project filter
2. Intent classification → layer selection
3. Keyword search within selected layer (filename match first, then content grep)
4. Direct file read for top-ranked results
5. If no results in primary layer, fall through to secondary layers

---

## 10. Implementation Modules

### Memory Engine (`lib/memory/`)

```
lib/memory/
  engine.ts              # MemoryEngine class — main entry, wires everything
  config.ts              # typed config loader, tier detection
  daily-writer.ts        # append to L1 markdown + events.json
  event-logger.ts        # structured event emission
  knowledge-manager.ts   # L2 CRUD by namespace
  tacit-manager.ts       # L3 read + propose (gated writes)
  retriever.ts           # intent-aware layer routing
  consolidator.ts        # nightly 6-pass job
  sync.ts                # bidirectional ChiefOS ↔ business unit
  types.ts               # all shared types

  autoresearch/
    worker.ts            # main loop — pick, dispatch, write
    queue.ts             # queue management
    router.ts            # question type → source selection
    synthesizer.ts       # LLM synthesis of raw findings
    sources/
      perplexity.ts      # Perplexity API client
      youtube.ts         # YouTube Data API client
      reddit.ts          # Reddit API client
      ahrefs.ts          # Ahrefs MCP bridge
```

### Dashboard (`app/memory/` + `components/memory/`)

```
app/memory/
  page.tsx               # Memory page with layer tabs

components/memory/
  layer-tabs.tsx         # L1/L2/L3 tab switcher
  daily-timeline.tsx     # L1 — scrollable event timeline
  knowledge-browser.tsx  # L2 — namespace grouped entity list
  tacit-rules.tsx        # L3 — rules list with approve/archive
  research-panel.tsx     # sidebar research queue + manual submit
  entity-viewer.tsx      # markdown renderer for L2/L3 files
```

### API Routes

All API routes require authentication. At ChiefOS/business-unit tier, routes are internal-only (localhost). At product tier, routes require session auth via Supabase Auth (JWT in Authorization header).

```
GET  /api/memory/daily?date=YYYY-MM-DD     # fetch daily notes
GET  /api/memory/knowledge?namespace=X      # list L2 entities
GET  /api/memory/tacit                      # list L3 rules
GET  /api/memory/research                   # research queue state
POST /api/memory/research                   # submit manual research item
POST /api/memory/daily/append               # append to today's daily note
POST /api/memory/tacit/approve              # promote tacit proposal (operator-only)
```

### Sidebar Addition

New nav item between Analytics and Manual. Uses `Brain` icon from lucide-react:

```
BarChart3  Analytics    /analytics
Brain      Memory       /memory
BookOpen   Manual       /manual
```

---

## 11. External Dependencies

| Dependency | Purpose | Status |
|---|---|---|
| Perplexity API | Web research, market trends | Key to be provided |
| YouTube Data API v3 | Competitor video analysis | Key to be provided |
| Reddit API | Community intel, viral hooks | Mock for MVP, real API later |
| Ahrefs MCP | SEO/content performance | Already connected |

No new heavy npm dependencies. YouTube and Reddit are REST calls. Perplexity is REST. Ahrefs is available via MCP.

**Note on Ahrefs:** The Ahrefs source uses MCP tool calls, not HTTP requests. This means a different invocation pattern (tool call vs fetch) and different error behavior (MCP tools can fail silently or return unstructured results). The `sources/ahrefs.ts` module must wrap MCP calls with explicit timeout and response validation.

---

## 12. Acceptance Criteria

MVP is successful when:

1. A full day of work is captured in L1 (daily note + events.json).
2. Nightly consolidation updates at least one L2 entity and proposes at least one L3 rule from daily work.
3. Heartbeat can surface stalled tasks from the current day.
4. Autoresearcher can take one flagged question, query sources, and write a structured finding into L2.
5. Retrieval returns the correct layer for the correct question type.
6. Namespace ownership is enforced — shared files cannot be written by the business unit.
7. Dashboard `/memory` page renders all three layers with working research queue.
8. Config switch to `tier: "product"` disables sync and system continues operating standalone.

---

## 13. Implementation Phases

| Phase | Scope |
|---|---|
| 1 | File structure, config, types, daily writer, event logger |
| 2 | Knowledge manager, tacit manager, seed files for PP domain |
| 3 | Retriever with intent-aware layer routing |
| 4 | Autoresearcher: queue, worker, Perplexity + YouTube sources |
| 5 | Autoresearcher: Reddit + Ahrefs sources, source router |
| 6 | Consolidator: nightly 6-pass job |
| 7 | Sync: bidirectional ChiefOS ↔ business unit |
| 8 | API routes for dashboard data + manual research submission |
| 9 | Dashboard: /memory page with L1/L2/L3 views + research panel |

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Overwriting durable memory with noisy session content | L2/L3 only updated through consolidation, never raw writes |
| Over-consolidating and losing useful granularity | L1 is append-only and never pruned, always preserves raw data |
| Untrusted external content entering canonical memory | Autoresearch writes to L2 with source attribution; L3 requires operator approval |
| Cross-project namespace contamination | Strict OWNED/SHARED enforcement in sync module |
| Autoresearch cost/focus drift | Max concurrent limit, priority queue, scheduled not continuous |
| Stale shared files after productization fork | Frozen snapshot becomes owned; product consolidator evolves from there |
| Storage growth over time | Daily notes: monthly roll-ups compress completed months. Research completed/: archive after 90 days. L1 raw files preserved indefinitely (small footprint) |

---

## 15. ADR: File-Based Markdown Storage

**Decision:** Use file-based markdown + JSON for all memory layers instead of SQLite, Postgres, or a vector database.

**Rationale:**
- **Human-readable** — operators can browse, edit, and audit memory with any text editor or git tool.
- **Git-native** — memory changes are trackable via git diff/log. Rollback is `git checkout`. Branch-based experimentation is free.
- **Portable** — no database server required at any tier. Productized instances run with zero infrastructure beyond the filesystem.
- **Agent-friendly** — every agent in the fleet (Claude Code, Agent Zero, OpenFang, ZeroClaw) can read/write markdown natively without database drivers.
- **Low operational cost** — no backup jobs, no connection pooling, no schema migrations.

**Trade-offs accepted:**
- No ACID transactions — mitigated by the write queue serialization in `engine.ts`.
- No complex queries — mitigated by namespace directory structure + keyword grep (sufficient for MVP scale).
- No vector search — mitigated by keyword heuristics in retriever. Vector indexing can be layered on top later without changing the storage format.
- Concurrent access limits — mitigated by lockfile mechanism for consolidation/sync.
