# Penthouse Papi — Hyperedit + Dashboard Design
**Date:** 2026-02-25
**Status:** Approved
**Owner:** Troy (ChiefOS)
**Operator:** Jerry Martin Jr. (Conductor, ChiefOS Media)

---

## 1. Goals

- Extend Penthouse Papi with a **Hyperedit Video Editing Service** (long-form → multi-clip pipeline)
- Build a **Penthouse Papi Dashboard** (Next.js 14) as the primary operator interface
- Embed **Remotion Studio** inside the dashboard for synthetic video work
- Integrate **OBS** as a capture/ingest source (hot folder → Supabase Storage)
- Deliver a **Jerry Operations Manual** in Git (`docs/jerry-operations.md`) and rendered at `/manual`
- Inspired by Poppy (getpoppy.ai) — but self-hosted, unlimited, and multi-brand

---

## 2. Architecture

### 2.1 Repository Layout

```
penthouse-papi/
├── dashboard/              ← NEW: Next.js 14 app (port 4000)
│   ├── app/
│   │   ├── page.tsx                  # Command Center
│   │   ├── calendar/page.tsx         # Content calendar
│   │   ├── concepts/page.tsx         # Concept intake + status
│   │   ├── hyperedit/page.tsx        # Job queue + clip previews
│   │   ├── studio/page.tsx           # Remotion Studio iframe
│   │   ├── analytics/page.tsx        # Performance dashboard
│   │   └── manual/page.tsx           # Jerry ops manual (rendered MD)
│   ├── components/
│   │   ├── ui/                       # Design system primitives
│   │   ├── layout/                   # Sidebar, header, brand switcher
│   │   ├── command-center/           # Stats cards, quick actions
│   │   ├── hyperedit/                # Job cards, clip table, plan viewer
│   │   ├── calendar/                 # Weekly grid, asset chips
│   │   └── studio/                   # Remotion iframe wrapper
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client
│   │   └── api.ts                    # Internal API helpers
│   └── package.json
│
├── hyperedit-worker/       ← NEW: Node.js worker (port 4001)
│   ├── worker.ts                     # Job queue poller (polls every 5s)
│   ├── transcribe.ts                 # OpenAI Whisper transcription
│   ├── planner.ts                    # LLM → VideoEditPlan generator
│   ├── renderer.ts                   # ffmpeg clip executor
│   ├── obs-watcher.ts                # Hot folder watcher for OBS output
│   ├── uploader.ts                   # Supabase Storage uploader
│   └── package.json
│
├── production/             ← EXISTING: Remotion Studio (port 3000)
├── clawdbot/               ← EXISTING: Agent skills
├── flow-workflows/         ← EXISTING + new LongformToClips template
├── supabase/
│   ├── schema.sql          ← EXISTING (v1)
│   └── schema-v2.sql       ← NEW: hyperedit_* tables
└── docs/
    ├── jerry-operations.md ← NEW: Training manual
    └── plans/              ← Design docs
```

### 2.2 Hyperedit Data Flow

```
1. OBS records → drops .mp4 to hot folder (e.g. C:/OBS-Output/)
2. obs-watcher.ts detects new file → uploads to Supabase Storage
3. User opens /hyperedit in dashboard
4. Pastes video URL or selects from Supabase Storage
5. Submits VideoEditRequest (platform targets, max clips, brand)
6. worker.ts polls hyperedit_requests (status = 'pending')
7. transcribe.ts → Whisper API → full transcript + timestamps
8. planner.ts → LLM (Claude/Kimi) → VideoEditPlan JSON saved to hyperedit_plans
9. renderer.ts → ffmpeg → clip files uploaded to Supabase Storage
10. hyperedit_clips rows updated (status = 'ready')
11. Dashboard shows clip grid with previews
12. Telegram notifies Jerry → /review → /approve → n8n → GHL
```

### 2.3 Asset Routing (Synthetic vs Repurposed)

| asset_type | asset_subtype     | Pipeline          |
|------------|-------------------|-------------------|
| video      | synthetic         | Remotion (existing) |
| video      | longform_clip     | Hyperedit (new)    |
| image      | static            | Stitch/DALL-E      |
| copy       | social            | ClawdBot           |

---

## 3. Dashboard UI Design

### 3.1 Design Language: "Dark Studio"

| Token       | Value     | Usage                    |
|-------------|-----------|--------------------------|
| bg          | #0A0A0F   | App background           |
| surface     | #13131A   | Card / panel background  |
| border      | #1E1E2E   | Subtle dividers          |
| accent      | #6C63FF   | Penthouse Papi purple    |
| gold        | #FFD700   | Goldbackbond brand       |
| success     | #22C55E   | Ready / approved states  |
| warning     | #F59E0B   | Review needed            |
| error       | #EF4444   | Failed / urgent          |
| text        | #E2E8F0   | Primary text             |
| muted       | #94A3B8   | Secondary text           |
| font        | Inter      | All text                 |

### 3.2 Navigation (Left Sidebar)

```
🏠 Command Center  /
📅 Calendar        /calendar
💡 Concepts        /concepts
✂️ Hyperedit       /hyperedit
🎬 Studio          /studio
📊 Analytics       /analytics
📖 Manual          /manual
─────────────────
⚙️ Settings        /settings
```

Brand switcher in header: [GBB] [COACH] [OPEN] — filters all views to selected brand.

### 3.3 Page Designs

#### Command Center (`/`)
- Stat cards: Today's posts, In Queue, Rendering, Needs Approval
- Active Hyperedit jobs with progress bars
- 7-day calendar strip (video/image/copy counts per day)
- Quick actions: New Concept, Drop Video, Review Queue

#### Hyperedit (`/hyperedit`)
- Video drop zone (URL or file)
- Platform target checkboxes (Reels, Shorts, LinkedIn, Twitter)
- Max clips slider, brand selector
- Job list with status chips (planning / transcribing / rendering / ready)
- Per-job clip table: #, title, duration, status, preview button
- Approve All / Revise Plan actions

#### Studio (`/studio`)
- Remotion Studio embedded as full-height iframe (localhost:3000)
- Composition selector above iframe (syncs with Remotion sidebar)
- Export to Calendar / Save as Template / Render buttons

#### Manual (`/manual`)
- Rendered `docs/jerry-operations.md`
- Sticky section nav (Daily Rhythm / Weekly / Troubleshooting / Commands)
- Search bar
- "Last updated" timestamp from git

---

## 4. Database Schema Extensions (schema-v2.sql)

```sql
-- Hyperedit Requests
CREATE TABLE hyperedit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID REFERENCES concepts(id),
  request_payload JSONB,
  status TEXT CHECK (status IN ('pending','planning','rendering','completed','failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hyperedit Plans (versioned)
CREATE TABLE hyperedit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES hyperedit_requests(id),
  plan_payload JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hyperedit Clips (output)
CREATE TABLE hyperedit_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES hyperedit_plans(id),
  calendar_item_id UUID REFERENCES calendar(id),
  platform_profile TEXT,
  render_url TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  status TEXT CHECK (status IN ('pending','ready','failed')),
  error JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add subtype to calendar for routing
ALTER TABLE calendar ADD COLUMN asset_subtype TEXT
  CHECK (asset_subtype IN ('synthetic','longform_clip','static','social'));

-- Indexes
CREATE INDEX idx_hyperedit_requests_status ON hyperedit_requests(status);
CREATE INDEX idx_hyperedit_clips_plan ON hyperedit_clips(plan_id);
CREATE INDEX idx_hyperedit_clips_status ON hyperedit_clips(status);
```

---

## 5. n8n Workflow: LongformToClipsCampaign

**Trigger:** Manual or Supabase webhook (new row in hyperedit_requests)
**Flow:**
1. Create VideoEditRequest → POST to hyperedit-worker API
2. Poll hyperedit_requests until status = 'completed'
3. Fetch hyperedit_clips (status = 'ready')
4. For each clip → insert calendar row (type: video, subtype: longform_clip)
5. Set post_date (one per day starting tomorrow)
6. Send Telegram notification to Jerry with preview links
7. On /approve → map to GHL location and schedule

---

## 6. OBS Integration

**Setup (one-time, manual):**
1. In OBS: Settings → Output → Recording Path = `C:/OBS-Output/penthouse-papi/`
2. `obs-watcher.ts` watches this folder for new `.mp4` / `.mkv` files
3. On new file detected:
   - Upload to Supabase Storage bucket `source-videos/`
   - Insert row into `hyperedit_requests` with `status = 'pending'` and source URL
   - Dashboard shows new job automatically

---

## 7. Hyperedit Worker: Antigravity Skills

Three skills to create in `clawdbot/skills/`:

| Skill                  | Input              | Output               |
|------------------------|--------------------|----------------------|
| plan_hyperedit_clips   | VideoEditRequest   | VideoEditPlan (JSON) |
| render_hyperedit_clips | VideoEditPlan      | VideoEditResult      |
| refine_hyperedit_plan  | Plan + NL feedback | Updated VideoEditPlan|

---

## 8. Jerry Operations Manual Structure (`docs/jerry-operations.md`)

Sections:
1. **Mindset** — You are the Conductor, not the editor
2. **Tools in Your Baton** — Antigravity, n8n, Supabase, GHL, Telegram
3. **Daily Rhythm** — Morning checklist, midday concepts, evening review
4. **Weekly Ritual** — 60-min Media Standup format
5. **Running a Concept** — Step-by-step concept → campaign walkthrough
6. **Hyperedit Workflow** — OBS → upload → plan → render → approve
7. **Brand Guides** — GBB tone, CoachAI tone, OpenChief tone
8. **Telegram Commands** — /concept, /review, /approve, /revise, /clips, /performance
9. **Incident Handling** — Off-brand post, broken render, failed n8n node
10. **First 30 Days Roadmap** — Week-by-week milestones

---

## 9. Implementation Phases

| Phase | Scope                              | Priority |
|-------|------------------------------------|----------|
| 1     | Dashboard scaffold + design system | P0       |
| 2     | Hyperedit worker + DB schema       | P0       |
| 3     | Command Center + Hyperedit pages   | P0       |
| 4     | Studio embed + Calendar page       | P1       |
| 5     | n8n LongformToClips template       | P1       |
| 6     | OBS watcher integration            | P1       |
| 7     | Jerry manual + /manual page        | P2       |
| 8     | Analytics page                     | P2       |

---

## 10. Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Dashboard     | Next.js 14, TypeScript, Tailwind CSS|
| UI Components | shadcn/ui (customized dark theme)   |
| Worker        | Node.js 20, TypeScript, tsx         |
| Video         | ffmpeg (system), @ffmpeg-installer  |
| Transcription | OpenAI Whisper API                  |
| LLM Planning  | Claude / Kimi K2.5 via OpenRouter   |
| Database      | Supabase (existing VPS instance)    |
| File Watch    | chokidar                            |
| Storage       | Supabase Storage                    |
| Remotion      | Existing (port 3000)                |
| Automation    | n8n (existing VPS)                  |
| Distribution  | GoHighLevel API                     |
