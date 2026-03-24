# Penthouse Papi Dashboard — Operator Manual

**Build Date:** 2026-03-23
**Builder:** Claude Code (Opus 4.6)
**Version:** MVP 1.0

---

## 1. What Was Built

A full-stack content creation command center with an integrated 3-layer memory autoresearcher system.

### Dashboard (Next.js 16 + Tailwind v4 + shadcn)

| Page | Route | Purpose |
|---|---|---|
| Command Center | `/` | Stats, 7-day calendar strip, active Hyperedit jobs, quick actions, fleet status |
| Calendar | `/calendar` | Content calendar (placeholder — needs Supabase) |
| Concepts | `/concepts` | Content concept intake (placeholder — needs Supabase) |
| Hyperedit | `/hyperedit` | Video drop zone, platform targets, clip config, brand selector |
| Studio | `/studio` | Remotion Studio iframe + Agent Chat tabs |
| Analytics | `/analytics` | Performance metrics (placeholder — needs data sources) |
| Memory | `/memory` | 3-layer memory viewer with L1/L2/L3 tabs + research queue |
| Manual | `/manual` | Operations manual (placeholder — will render jerry-operations.md) |
| Settings | `/settings` | Supabase, OpenFang, API key configuration |

### 3-Layer Memory Engine (`lib/memory/`)

| Layer | Purpose | Storage |
|---|---|---|
| L1: Daily Notes | Append-only operational log per day | `memory/daily/YYYY/MM/YYYY-MM-DD.md` + `.events.json` |
| L2: Knowledge Graph | Durable facts, entities, market intel | `memory/knowledge/{namespace}/{slug}.md` |
| L3: Tacit Knowledge | Behavioral rules, patterns, preferences | `memory/tacit/{slug}.md` |

### Autoresearch Pipeline

Background worker queries 4 sources, synthesizes findings, writes to L1 + L2:

| Source | API | Status |
|---|---|---|
| Perplexity | REST (`api.perplexity.ai`) | Ready — needs `PERPLEXITY_API_KEY` |
| YouTube | Data API v3 | Ready — needs `YOUTUBE_API_KEY` |
| Reddit | Public JSON API | Ready — no auth needed for MVP |
| Ahrefs | MCP (Claude Code only) | Stub — works in agent runtime |

### Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Heartbeat | Every 15 min | Detect stalled tasks, repeated blockers, queue health |
| Autoresearch | Every 4 hours | Process research queue items |
| Consolidation | 2 AM nightly | 6-pass: fact extraction, L2 updates, pattern detection, tacit proposals, archival, index |
| Sync | After consolidation | Pull shared namespaces from ChiefOS, push daily digest upstream |

---

## 2. How to Run

### Start the dashboard

```bash
cd "C:\Users\Troy\Chief OS\penthouse-papi\dashboard"
npm run dev
```

Opens at **http://localhost:3000**

### Run tests

```bash
npm test              # vitest run (all 53 tests)
npm run test:watch    # vitest watch mode
```

### API endpoints (all at localhost:3000)

```
GET  /api/memory/daily?date=2026-03-23     # Fetch daily notes + events
POST /api/memory/daily/append              # Append to today's note
     Body: { "content": "...", "source": "agent-id", "tags": ["needs_research"] }

GET  /api/memory/knowledge                 # List all namespaces with counts
GET  /api/memory/knowledge?namespace=brands # List entities in a namespace

GET  /api/memory/tacit                     # List all tacit rules
POST /api/memory/tacit/approve             # Promote a tacit proposal
     Body: { "slug": "rule-name", "content": "...", "confidence": 3 }

GET  /api/memory/research                  # List research queue
POST /api/memory/research                  # Submit manual research question
     Body: { "question": "What gold trends affect GBB?", "priority": "p1", "namespace": "market-intel" }
```

---

## 3. Memory System Architecture

### Namespace Ownership

| Namespace | Owner | Who Writes |
|---|---|---|
| `content/` | Penthouse Papi | PP agents |
| `brands/` | Penthouse Papi | PP agents |
| `campaigns/` | Penthouse Papi | PP agents |
| `market-intel/` | Penthouse Papi | PP agents |
| `fleet/` | ChiefOS | Sync pulls from ChiefOS only |
| `infrastructure/` | ChiefOS | Sync pulls from ChiefOS only |

### Write Rules

- **L1 (Daily Notes):** Any agent can append. Never edit past entries.
- **L2 (Knowledge Graph):** Only consolidator and autoresearcher write. Manual writes via API allowed for owned namespaces. Shared namespaces blocked.
- **L3 (Tacit Knowledge):** Only the consolidator can write (via the `isConsolidation` flag). Proposals go to daily notes tagged `tacit_proposal`, then get promoted during consolidation after operator review.

### Concurrency Safety

All file writes go through `MemoryEngine.enqueueWrite()` — a serialized async queue. No direct `fs.writeFile` calls anywhere.

Consolidation and sync acquire exclusive locks (`.consolidation.lock`, `.sync.lock`) before running. Locks auto-expire after 10 minutes to prevent deadlocks.

### Research Item Lifecycle

```
Trigger → queued → active → [sources queried] → [synthesized] → complete
                                                               → failed (retry with 2^n * 15min backoff)
                                                               → dead (after 3 retries)
```

### Retrieval Model

The retriever uses keyword heuristics to route queries to the correct layer:

- Temporal words ("today", "yesterday", "last week") → L1
- Entity/fact words ("what is", "API", "endpoint") → L2
- Behavioral words ("rule", "preference", "always", "never") → L3
- Ambiguous → L2 first, then fallthrough to L1, L3

---

## 4. Configuration

### memory/config.json

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

### Tier Modes

| Tier | Sync | Use Case |
|---|---|---|
| `business-unit` | Bidirectional with ChiefOS | Normal operation |
| `chiefos` | Aggregates from all business units | Fleet-level orchestration |
| `product` | Disabled — fully standalone | Shipped customer instance |

To productize: change `"tier": "product"` and `"sync": { "enabled": false }`. The system continues operating independently.

---

## 5. Environment Variables (to add)

```env
PERPLEXITY_API_KEY=pplx-...        # Required for autoresearch + synthesis
YOUTUBE_API_KEY=AIza...             # Required for YouTube source
NEXT_PUBLIC_OPENFANG_URL=http://localhost:4200
NEXT_PUBLIC_OPENFANG_API_KEY=...
```

---

## 6. File Structure

```
penthouse-papi/dashboard/
  app/
    page.tsx                         # Command Center
    memory/page.tsx                  # Memory viewer (L1/L2/L3 tabs)
    hyperedit/page.tsx               # Video processing pipeline
    studio/page.tsx                  # Remotion + Agent Chat
    calendar/page.tsx                # Content calendar
    concepts/page.tsx                # Concept intake
    analytics/page.tsx               # Performance metrics
    manual/page.tsx                  # Operations manual
    settings/page.tsx                # Configuration
    api/memory/
      daily/route.ts                 # GET daily notes
      daily/append/route.ts          # POST append to daily
      knowledge/route.ts             # GET knowledge entities
      tacit/route.ts                 # GET tacit rules
      tacit/approve/route.ts         # POST approve tacit rule
      research/route.ts              # GET/POST research queue

  lib/memory/
    types.ts                         # All shared interfaces
    config.ts                        # Config loader with deep merge
    engine.ts                        # Singleton engine with write queue + locks
    daily-writer.ts                  # L1: append-only daily notes
    event-logger.ts                  # L1: structured JSON events
    knowledge-manager.ts             # L2: entity CRUD with namespace ownership
    tacit-manager.ts                 # L3: gated rule management
    retriever.ts                     # Intent-aware search across layers
    consolidator.ts                  # Nightly 6-pass consolidation
    heartbeat.ts                     # Stalled task + blocker detection
    sync.ts                          # Bidirectional ChiefOS sync
    server.ts                        # Singleton accessors for API routes
    autoresearch/
      queue.ts                       # Research item queue with retry/backoff
      router.ts                      # Question → source routing
      worker.ts                      # Main research worker loop
      synthesizer.ts                 # LLM synthesis of raw findings
      sources/
        perplexity.ts                # Perplexity REST client
        youtube.ts                   # YouTube Data API v3 client
        reddit.ts                    # Reddit public JSON API
        ahrefs.ts                    # MCP stub for agent runtime

  lib/openfang.ts                    # OpenFang API client (Hands, Agents, WS)

  components/
    layout/
      sidebar.tsx                    # Left nav with all pages
      header.tsx                     # Brand switcher + search + notifications
      shell.tsx                      # Dashboard shell wrapper
    command-center/
      stat-card.tsx                  # Metric card with glow effects
      calendar-strip.tsx             # 7-day pipeline overview
      quick-actions.tsx              # Action grid
      active-jobs.tsx                # Hyperedit job status
      fleet-status.tsx               # Agent fleet health
    memory/
      layer-tabs.tsx                 # L1/L2/L3 tab switcher
      daily-timeline.tsx             # L1 event timeline
      knowledge-browser.tsx          # L2 namespace + entity browser
      tacit-rules.tsx                # L3 rules with confidence
      research-panel.tsx             # Research queue + manual submit

  memory/
    config.json                      # Runtime configuration
    daily/                           # L1 daily notes (auto-created)
    knowledge/
      content/hooks-and-patterns.md  # Seed
      brands/gbb.md                  # Seed
      brands/coachai.md              # Seed
      brands/openchief.md            # Seed
    tacit/
      content-rules.md               # Seed
      brand-voice.md                 # Seed
    research/
      queue.json                     # Active research queue
      completed/                     # Archived completed items
    state/
      heartbeat.json                 # Heartbeat state
      consolidation.json             # Consolidation state
      sync.json                      # Sync checksums
```

---

## 7. Seed Knowledge (Pre-loaded)

### L2: Knowledge Graph

- **brands/gbb** — Goldbackbond: gold-backed financial products, authoritative/data-driven tone
- **brands/coachai** — CoachAI Tech Camps: AI education for youth, energetic/accessible tone
- **brands/openchief** — OpenChief: agent orchestration platform, technical/builder tone
- **content/hooks-and-patterns** — Placeholder for autoresearch enrichment

### L3: Tacit Rules

- **content-rules** (confidence: 3) — Contrarian hooks outperform 3x, video > images for awareness, Mon=video/Wed=image/Fri=copy
- **brand-voice** (confidence: 5) — Per-brand tone guides for GBB, CoachAI, OpenChief

---

## 8. Design Theme

"Dark Studio" — production studio aesthetic.

| Token | Value | Usage |
|---|---|---|
| Background | `#0A0A0F` | App background |
| Surface | `#13131A` | Card/panel background |
| Border | `#1E1E2E` | Subtle dividers |
| Purple | `#6C63FF` | Primary accent |
| Gold | `#FFD700` | Goldbackbond brand |
| Success | `#22C55E` | Ready/approved states |
| Warning | `#F59E0B` | Review needed |
| Error | `#EF4444` | Failed/urgent |
| Text | `#E2E8F0` | Primary text |
| Muted | `#94A3B8` | Secondary text |

Effects: noise texture overlay, purple glow on hover, staggered fade-in animations, pulse ring on active indicators.

---

## 9. What's Next

| Priority | Item |
|---|---|
| P0 | Add Perplexity + YouTube API keys to `.env` and test live autoresearch |
| P0 | Set up cron jobs for heartbeat (15 min), autoresearch (4h), consolidation (2 AM) |
| P1 | Wire Supabase for calendar, concepts, and analytics pages |
| P1 | Build Hyperedit worker (ffmpeg + Whisper transcription pipeline) |
| P1 | Connect OpenFang agent chat in Studio page |
| P2 | Add Jerry Operations Manual at `/manual` |
| P2 | Create ChiefOS root `memory/` directory and test sync |
| P2 | Add Supabase Auth for product-tier API route protection |

---

## 10. Commit History

```
825294a test(memory): full lifecycle integration test
bd22b1a feat(memory): dashboard /memory page with L1/L2/L3 views + research panel
974ad07 feat(memory): API routes for daily, knowledge, tacit, research
b3a94f3 feat(memory): bidirectional sync with checksum tracking + lock
cbdf7ed feat(memory): heartbeat — stalled task detection, repeated blocker -> research
3b142c2 feat(memory): nightly consolidator with 6-pass pipeline + lock mechanism
d043817 feat(memory): autoresearch queue, worker, router, 4 sources
4060187 feat(memory): intent-aware retriever with keyword heuristics + fallthrough
aa2cf17 feat(memory): knowledge + tacit managers with seed files and tests
d273813 feat(memory): daily writer + event logger with tests
```

**Test suite:** 53 tests across 13 files, all passing.
