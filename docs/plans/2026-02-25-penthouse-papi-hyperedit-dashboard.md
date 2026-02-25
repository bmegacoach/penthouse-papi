# Penthouse Papi — Hyperedit + Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full Penthouse Papi operator dashboard (Next.js 14) with an embedded Remotion Studio, Hyperedit long-form-to-clips worker, OBS ingest, Jerry operations manual, and a polished dark-studio UI inspired by Poppy.

**Architecture:** Next.js 14 dashboard (port 4000) as the main operator UI embedding Remotion Studio (port 3000) in an iframe. A separate Node.js `hyperedit-worker` process (port 4001) handles long-running ffmpeg/transcription/LLM jobs by polling Supabase as a job queue. OBS writes recordings to a hot folder; `obs-watcher.ts` detects and uploads them automatically.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (DB + Storage), ffmpeg (system), OpenAI Whisper API, chokidar (file watching), tsx (worker runtime)

**Design Reference:** `docs/plans/2026-02-25-hyperedit-dashboard-design.md`

---

## Phase 1 — Dashboard Scaffold + Design System

### Task 1: Bootstrap Next.js Dashboard App

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/next.config.ts`
- Create: `dashboard/tailwind.config.ts`
- Create: `dashboard/tsconfig.json`

**Step 1: Scaffold Next.js app**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
npx create-next-app@latest dashboard --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
```

Expected: Dashboard folder created with Next.js 14 App Router.

**Step 2: Install core dependencies**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard"
npm install @supabase/supabase-js lucide-react next-themes clsx tailwind-merge
npx shadcn@latest init
```

When prompted by shadcn: style=`default`, base color=`slate`, CSS variables=`yes`.

**Step 3: Install remaining shadcn components**

```bash
npx shadcn@latest add card badge button progress separator tabs table dialog
```

**Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Server at http://localhost:3000 (change to 4000 in next step)

**Step 5: Set port to 4000**

Edit `dashboard/package.json`, change scripts.dev:
```json
"dev": "next dev --port 4000",
```

**Step 6: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: bootstrap Next.js 14 dashboard app"
```

---

### Task 2: Dark Studio Design System

**Files:**
- Modify: `dashboard/app/globals.css`
- Create: `dashboard/lib/utils.ts`
- Create: `dashboard/components/ui/stat-card.tsx`
- Create: `dashboard/components/ui/status-badge.tsx`

**Step 1: Set dark studio CSS tokens in globals.css**

Replace the entire `dashboard/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 4%;
    --foreground: 220 14% 89%;
    --card: 240 8% 8%;
    --card-foreground: 220 14% 89%;
    --popover: 240 8% 8%;
    --popover-foreground: 220 14% 89%;
    --primary: 251 80% 70%;
    --primary-foreground: 240 10% 4%;
    --secondary: 240 6% 12%;
    --secondary-foreground: 220 14% 89%;
    --muted: 240 6% 12%;
    --muted-foreground: 220 9% 60%;
    --accent: 251 80% 70%;
    --accent-foreground: 240 10% 4%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 220 14% 89%;
    --border: 240 6% 14%;
    --input: 240 6% 14%;
    --ring: 251 80% 70%;
    --radius: 0.5rem;
    --gold: 48 100% 50%;
    --success: 142 71% 45%;
    --warning: 38 92% 50%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { @apply bg-background; }
  ::-webkit-scrollbar-thumb { @apply bg-border rounded-full; }
}
```

**Step 2: Update tailwind.config.ts to add brand colors**

```typescript
import type { Config } from "tailwindcss";
const { fontFamily } = require("tailwindcss/defaultTheme");

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        gold: "hsl(var(--gold))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**Step 3: Create StatCard component**

Create `dashboard/components/ui/stat-card.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "purple" | "gold" | "success" | "warning" | "error";
  sub?: string;
}

const accentMap = {
  purple: "text-primary border-primary/20",
  gold: "text-gold border-gold/20",
  success: "text-success border-success/20",
  warning: "text-warning border-warning/20",
  error: "text-destructive border-destructive/20",
};

export function StatCard({ label, value, icon: Icon, accent = "purple", sub }: StatCardProps) {
  return (
    <Card className={cn("border bg-card", accentMap[accent])}>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <Icon className={cn("w-8 h-8 opacity-60", accentMap[accent].split(" ")[0])} />
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create StatusBadge component**

Create `dashboard/components/ui/status-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "pending" | "planning" | "transcribing" | "rendering" | "ready" | "approved" | "failed" | "queued" | "generating" | "review" | "posted";

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending:      { label: "Pending",      className: "bg-muted text-muted-foreground" },
  planning:     { label: "Planning",     className: "bg-primary/20 text-primary" },
  transcribing: { label: "Transcribing", className: "bg-primary/20 text-primary" },
  rendering:    { label: "Rendering",    className: "bg-warning/20 text-warning" },
  ready:        { label: "Ready",        className: "bg-success/20 text-success" },
  approved:     { label: "Approved",     className: "bg-success/20 text-success" },
  failed:       { label: "Failed",       className: "bg-destructive/20 text-destructive" },
  queued:       { label: "Queued",       className: "bg-muted text-muted-foreground" },
  generating:   { label: "Generating",   className: "bg-primary/20 text-primary" },
  review:       { label: "Review",       className: "bg-warning/20 text-warning" },
  posted:       { label: "Posted",       className: "bg-success/20 text-success" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-muted" };
  return (
    <Badge className={cn("text-xs font-medium border-0", config.className)}>
      {config.label}
    </Badge>
  );
}
```

**Step 5: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: add dark studio design system and base UI components"
```

---

### Task 3: App Layout with Sidebar Navigation

**Files:**
- Create: `dashboard/components/layout/sidebar.tsx`
- Create: `dashboard/components/layout/header.tsx`
- Create: `dashboard/components/layout/brand-switcher.tsx`
- Modify: `dashboard/app/layout.tsx`

**Step 1: Create Sidebar**

Create `dashboard/components/layout/sidebar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Calendar, Lightbulb, Scissors, Film,
  BarChart3, BookOpen, Settings
} from "lucide-react";

const navItems = [
  { href: "/",          icon: Home,      label: "Command Center" },
  { href: "/calendar",  icon: Calendar,  label: "Calendar" },
  { href: "/concepts",  icon: Lightbulb, label: "Concepts" },
  { href: "/hyperedit", icon: Scissors,  label: "Hyperedit" },
  { href: "/studio",    icon: Film,      label: "Studio" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/manual",    icon: BookOpen,  label: "Manual" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col py-4">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <div>
            <p className="text-sm font-bold text-foreground">Penthouse Papi</p>
            <p className="text-xs text-muted-foreground">ChiefOS Media</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="px-2 mt-4 border-t border-border pt-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
```

**Step 2: Create BrandSwitcher**

Create `dashboard/components/layout/brand-switcher.tsx`:

```tsx
"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const brands = [
  { id: "gbb",    label: "GBB",   color: "text-gold   border-gold/30   bg-gold/10" },
  { id: "coach",  label: "COACH", color: "text-primary border-primary/30 bg-primary/10" },
  { id: "open",   label: "OPEN",  color: "text-success border-success/30 bg-success/10" },
];

export function BrandSwitcher() {
  const [active, setActive] = useState("gbb");
  return (
    <div className="flex gap-1">
      {brands.map((b) => (
        <button
          key={b.id}
          onClick={() => setActive(b.id)}
          className={cn(
            "px-3 py-1 rounded text-xs font-bold border transition-all",
            active === b.id ? b.color : "text-muted-foreground border-border hover:border-muted-foreground"
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Create Header**

Create `dashboard/components/layout/header.tsx`:

```tsx
import { BrandSwitcher } from "./brand-switcher";

export function Header() {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <BrandSwitcher />
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs text-muted-foreground">Jerry</span>
      </div>
    </header>
  );
}
```

**Step 4: Update root layout**

Replace `dashboard/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Penthouse Papi",
  description: "ChiefOS Media Production Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**Step 5: Start dev server and verify layout**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard"
npm run dev
```

Open http://localhost:4000 — should see sidebar + header with dark studio theme.

**Step 6: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: add sidebar navigation and app layout"
```

---

## Phase 2 — Supabase Schema v2 + Client

### Task 4: Database Schema Extensions

**Files:**
- Create: `supabase/schema-v2.sql`
- Create: `dashboard/lib/supabase.ts`
- Create: `dashboard/lib/types.ts`

**Step 1: Write schema-v2.sql**

Create `supabase/schema-v2.sql`:

```sql
-- Penthouse Papi Schema v2
-- Run AFTER schema.sql

-- Add asset_subtype to calendar for routing
ALTER TABLE calendar
  ADD COLUMN IF NOT EXISTS asset_subtype TEXT
  CHECK (asset_subtype IN ('synthetic','longform_clip','static','social'));

-- Hyperedit Requests (job intake)
CREATE TABLE IF NOT EXISTS hyperedit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID REFERENCES concepts(id),
  brand TEXT NOT NULL CHECK (brand IN ('goldbackbond','coachAI','camp_alpha','openchiefos')),
  request_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','planning','rendering','completed','failed')),
  error JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hyperedit Plans (LLM-generated VideoEditPlan)
CREATE TABLE IF NOT EXISTS hyperedit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES hyperedit_requests(id) ON DELETE CASCADE,
  plan_payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hyperedit Clips (rendered output)
CREATE TABLE IF NOT EXISTS hyperedit_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES hyperedit_plans(id) ON DELETE CASCADE,
  calendar_item_id UUID REFERENCES calendar(id),
  platform_profile TEXT NOT NULL,
  clip_title TEXT,
  render_url TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  start_time_sec NUMERIC,
  end_time_sec NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ready','failed')),
  error JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hyperedit_requests_status
  ON hyperedit_requests(status);
CREATE INDEX IF NOT EXISTS idx_hyperedit_requests_brand
  ON hyperedit_requests(brand);
CREATE INDEX IF NOT EXISTS idx_hyperedit_clips_plan
  ON hyperedit_clips(plan_id);
CREATE INDEX IF NOT EXISTS idx_hyperedit_clips_status
  ON hyperedit_clips(status);

-- Updated_at trigger for hyperedit_requests
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hyperedit_requests_updated_at
  BEFORE UPDATE ON hyperedit_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Step 2: Create Supabase client**

Create `dashboard/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 3: Create shared TypeScript types**

Create `dashboard/lib/types.ts`:

```typescript
export type Brand = "goldbackbond" | "coachAI" | "camp_alpha" | "openchiefos";

export type HyperedietRequestStatus = "pending" | "planning" | "rendering" | "completed" | "failed";
export type HyperedietClipStatus = "pending" | "ready" | "failed";
export type CalendarStatus = "queued" | "generating" | "review" | "approved" | "posted" | "failed";

export interface HyperedeitRequest {
  id: string;
  brand: Brand;
  request_payload: VideoEditRequest;
  status: HyperedietRequestStatus;
  error?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HyperedeitPlan {
  id: string;
  request_id: string;
  plan_payload: VideoEditPlan;
  version: number;
  created_at: string;
}

export interface HyperedeitClip {
  id: string;
  plan_id: string;
  calendar_item_id?: string;
  platform_profile: string;
  clip_title?: string;
  render_url?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  status: HyperedietClipStatus;
  created_at: string;
}

export interface VideoEditRequest {
  request_id: string;
  source_videos: { url: string; type: string; priority: number }[];
  target_profiles: { platform: string; aspect_ratio: string; max_duration_sec: number; style: string }[];
  brand: Brand;
  goals: string[];
  max_clips: number;
  language: string;
}

export interface VideoEditPlan {
  request_id: string;
  clips: VideoEditPlanClip[];
}

export interface VideoEditPlanClip {
  clip_id: string;
  title: string;
  platform_profile: string;
  start_time_sec: number;
  end_time_sec: number;
  transcript_segment: string;
  visual_instructions: Record<string, unknown>;
  audio_instructions: Record<string, unknown>;
}

export interface CalendarItem {
  id: string;
  concept_id: string;
  post_date: string;
  asset_type: string;
  asset_subtype?: string;
  platform: string[];
  theme?: string;
  production_status: CalendarStatus;
  priority: string;
}
```

**Step 4: Create .env.local template**

Create `dashboard/.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
OPENROUTER_API_KEY=sk-or-v1-...
REMOTION_STUDIO_URL=http://localhost:3000
HYPEREDIT_WORKER_URL=http://localhost:4001
```

**Step 5: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add supabase/schema-v2.sql dashboard/lib/
git commit -m "feat: add schema-v2, Supabase client, and shared TypeScript types"
```

---

## Phase 3 — Command Center Page

### Task 5: Command Center (`/`)

**Files:**
- Modify: `dashboard/app/page.tsx`
- Create: `dashboard/components/command-center/stats-row.tsx`
- Create: `dashboard/components/command-center/hyperedit-jobs-panel.tsx`
- Create: `dashboard/components/command-center/calendar-strip.tsx`
- Create: `dashboard/components/command-center/quick-actions.tsx`

**Step 1: Create StatsRow component**

Create `dashboard/components/command-center/stats-row.tsx`:

```tsx
import { StatCard } from "@/components/ui/stat-card";
import { CalendarDays, Clock, Loader2, AlertTriangle } from "lucide-react";

interface StatsRowProps {
  todayCount: number;
  queueCount: number;
  renderingCount: number;
  approvalCount: number;
}

export function StatsRow({ todayCount, queueCount, renderingCount, approvalCount }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Today's Posts"    value={todayCount}   icon={CalendarDays} accent="purple" />
      <StatCard label="In Queue"         value={queueCount}   icon={Clock}        accent="warning" />
      <StatCard label="Rendering"        value={renderingCount} icon={Loader2}    accent="gold" />
      <StatCard label="Needs Approval"   value={approvalCount} icon={AlertTriangle} accent="error"
        sub={approvalCount > 0 ? "⚡ Action required" : undefined} />
    </div>
  );
}
```

**Step 2: Create HyperedeitJobsPanel**

Create `dashboard/components/command-center/hyperedit-jobs-panel.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, Scissors } from "lucide-react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  clips_total: number;
  clips_done: number;
  status: "planning" | "rendering" | "completed" | "failed";
}

export function HyperedeitJobsPanel({ jobs }: { jobs: Job[] }) {
  const pct = (j: Job) => j.clips_total ? Math.round((j.clips_done / j.clips_total) * 100) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" /> Hyperedit Jobs
        </CardTitle>
        <Link href="/hyperedit">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> New Job
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No active jobs. Drop a video to get started.</p>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{job.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{job.clips_done}/{job.clips_total} clips</span>
                <StatusBadge status={job.status} />
              </div>
            </div>
            <Progress value={pct(job)} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create CalendarStrip**

Create `dashboard/components/command-center/calendar-strip.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface DayData { videos: number; images: number; copy: number; }

export function CalendarStrip({ week }: { week: DayData[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" /> Next 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const d = week[i] ?? { videos: 0, images: 0, copy: 0 };
            const total = d.videos + d.images + d.copy;
            return (
              <div key={day} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{day}</p>
                <div className={`rounded-md p-2 text-xs space-y-0.5 ${total > 0 ? "bg-secondary" : "bg-background border border-border"}`}>
                  {d.videos > 0 && <p className="text-primary font-medium">▶{d.videos}</p>}
                  {d.images > 0 && <p className="text-gold font-medium">📷{d.images}</p>}
                  {d.copy   > 0 && <p className="text-success font-medium">✍{d.copy}</p>}
                  {total === 0  && <p className="text-muted-foreground">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create QuickActions**

Create `dashboard/components/command-center/quick-actions.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Lightbulb, Scissors, Eye } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="flex gap-3">
      <Link href="/concepts">
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Lightbulb className="w-4 h-4" /> New Concept
        </Button>
      </Link>
      <Link href="/hyperedit">
        <Button variant="outline" className="gap-2 border-gold/30 text-gold hover:bg-gold/10">
          <Scissors className="w-4 h-4" /> Drop Video
        </Button>
      </Link>
      <Link href="/hyperedit?tab=review">
        <Button variant="outline" className="gap-2 border-warning/30 text-warning hover:bg-warning/10">
          <Eye className="w-4 h-4" /> Review Queue
        </Button>
      </Link>
    </div>
  );
}
```

**Step 5: Build Command Center page**

Replace `dashboard/app/page.tsx`:

```tsx
import { StatsRow } from "@/components/command-center/stats-row";
import { HyperedeitJobsPanel } from "@/components/command-center/hyperedit-jobs-panel";
import { CalendarStrip } from "@/components/command-center/calendar-strip";
import { QuickActions } from "@/components/command-center/quick-actions";

// Placeholder data — replace with Supabase queries in Task 8
const MOCK_JOBS = [
  { id: "1", title: "GBB Podcast Ep.12", clips_total: 12, clips_done: 9, status: "rendering" as const },
  { id: "2", title: "CoachAI Camp Promo", clips_total: 5,  clips_done: 1, status: "planning"  as const },
];

const MOCK_WEEK = [
  { videos: 3, images: 1, copy: 0 },
  { videos: 0, images: 2, copy: 1 },
  { videos: 5, images: 0, copy: 2 },
  { videos: 0, images: 1, copy: 0 },
  { videos: 3, images: 0, copy: 1 },
  { videos: 0, images: 0, copy: 0 },
  { videos: 0, images: 2, copy: 0 },
];

export default function CommandCenter() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground">ChiefOS Media Production Dashboard</p>
      </div>

      <StatsRow todayCount={8} queueCount={14} renderingCount={3} approvalCount={2} />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <HyperedeitJobsPanel jobs={MOCK_JOBS} />
        </div>
        <div>
          <CalendarStrip week={MOCK_WEEK} />
        </div>
      </div>

      <QuickActions />
    </div>
  );
}
```

**Step 6: Verify in browser**

Open http://localhost:4000 — should show dark studio command center with stats, job progress bars, 7-day strip, and quick action buttons.

**Step 7: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: build Command Center page with stats, jobs, calendar strip"
```

---

## Phase 4 — Hyperedit Page

### Task 6: Hyperedit Dashboard Page (`/hyperedit`)

**Files:**
- Create: `dashboard/app/hyperedit/page.tsx`
- Create: `dashboard/components/hyperedit/video-drop-zone.tsx`
- Create: `dashboard/components/hyperedit/job-list.tsx`
- Create: `dashboard/components/hyperedit/clip-table.tsx`

**Step 1: Create VideoDropZone**

Create `dashboard/components/hyperedit/video-drop-zone.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scissors, Upload, Link as LinkIcon } from "lucide-react";

const PLATFORMS = [
  { id: "instagram_reel",  label: "Reels",    ratio: "9:16", max: 30  },
  { id: "youtube_short",   label: "Shorts",   ratio: "9:16", max: 60  },
  { id: "linkedin_video",  label: "LinkedIn", ratio: "16:9", max: 120 },
  { id: "twitter_video",   label: "Twitter",  ratio: "16:9", max: 60  },
];

const BRANDS = ["goldbackbond","coachAI","camp_alpha","openchiefos"];

interface VideoDropZoneProps {
  onSubmit: (data: { url: string; platforms: string[]; maxClips: number; brand: string }) => void;
}

export function VideoDropZone({ onSubmit }: VideoDropZoneProps) {
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram_reel","youtube_short"]);
  const [maxClips, setMaxClips] = useState(10);
  const [brand, setBrand] = useState("goldbackbond");

  const toggle = (id: string) =>
    setPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Card className="bg-card border-border border-dashed border-primary/30">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Scissors className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">New Hyperedit Job</h2>
        </div>

        {/* URL input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="YouTube URL or Supabase Storage URL..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button variant="outline" className="gap-2 border-border">
            <Upload className="w-4 h-4" /> Upload File
          </Button>
        </div>

        {/* Platform targets */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Platform targets</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                  platforms.includes(p.id)
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {p.label} <span className="opacity-60">{p.ratio}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Max clips:</span>
            <select
              value={maxClips}
              onChange={e => setMaxClips(Number(e.target.value))}
              className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
            >
              {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Brand:</span>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
            >
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <Button
            className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            disabled={!url || platforms.length === 0}
            onClick={() => onSubmit({ url, platforms, maxClips, brand })}
          >
            <Scissors className="w-4 h-4" /> Generate Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create ClipTable**

Create `dashboard/components/hyperedit/clip-table.tsx`:

```tsx
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Play, Check } from "lucide-react";
import type { HyperedeitClip } from "@/lib/types";

interface ClipTableProps {
  clips: HyperedeitClip[];
  onApproveAll: () => void;
}

export function ClipTable({ clips, onApproveAll }: ClipTableProps) {
  if (clips.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {clips.length} clips planned
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-success/30 text-success hover:bg-success/10" onClick={onApproveAll}>
            <Check className="w-3 h-3" /> Approve All
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">#</th>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Title</th>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Platform</th>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Duration</th>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Status</th>
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clips.map((clip, i) => (
              <tr key={clip.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-3 py-2 text-muted-foreground">#{String(i+1).padStart(2,"0")}</td>
                <td className="px-3 py-2 text-foreground font-medium max-w-[240px] truncate">{clip.clip_title ?? "Untitled"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{clip.platform_profile}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {clip.duration_sec ? `${clip.duration_sec.toFixed(1)}s` : "—"}
                </td>
                <td className="px-3 py-2"><StatusBadge status={clip.status} /></td>
                <td className="px-3 py-2">
                  {clip.render_url ? (
                    <a href={clip.render_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Play className="w-3 h-3" />
                      </Button>
                    </a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Build Hyperedit page**

Create `dashboard/app/hyperedit/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { VideoDropZone } from "@/components/hyperedit/video-drop-zone";
import { ClipTable } from "@/components/hyperedit/clip-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";

// Mock jobs — replace with Supabase live data in Task 8
const MOCK_CLIPS = [
  { id: "1", plan_id: "p1", platform_profile: "instagram_reel", clip_title: "Why RE Beats Stocks", duration_sec: 24.3, status: "ready" as const, created_at: "" },
  { id: "2", plan_id: "p1", platform_profile: "instagram_reel", clip_title: "12% APY Explained",  duration_sec: 18.1, status: "ready" as const, created_at: "" },
  { id: "3", plan_id: "p1", platform_profile: "youtube_short",  clip_title: "Market Crash Response", duration_sec: 31.0, status: "rendering" as const, created_at: "" },
  { id: "4", plan_id: "p1", platform_profile: "youtube_short",  clip_title: "Investor Story Hook", duration_sec: 22.5, status: "pending" as const, created_at: "" },
];

export default function HyperedeitPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" /> Hyperedit
        </h1>
        <p className="text-sm text-muted-foreground">Long-form video → platform-specific clips, automatically.</p>
      </div>

      <VideoDropZone onSubmit={(data) => { console.log("Submit:", data); setSubmitted(true); }} />

      {/* Active job */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">GBB Podcast Ep.12</p>
              <p className="text-xs text-muted-foreground">goldbackbond · 12 clips · instagram_reel, youtube_short</p>
            </div>
            <StatusBadge status="rendering" />
          </div>
          <ClipTable clips={MOCK_CLIPS} onApproveAll={() => alert("Approved all clips!")} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Verify in browser**

Open http://localhost:4000/hyperedit — should show drop zone, platform toggles, and clip table with status badges.

**Step 5: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: build Hyperedit page with drop zone and clip table"
```

---

## Phase 5 — Studio Embed Page

### Task 7: Studio Page (`/studio`)

**Files:**
- Create: `dashboard/app/studio/page.tsx`
- Create: `dashboard/components/studio/remotion-embed.tsx`
- Modify: `dashboard/next.config.ts`

**Step 1: Allow iframe in Next.js config**

Edit `dashboard/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: Create RemotionEmbed component**

Create `dashboard/components/studio/remotion-embed.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";

const REMOTION_URL = process.env.NEXT_PUBLIC_REMOTION_URL ?? "http://localhost:3000";

export function RemotionEmbed() {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{REMOTION_URL}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setKey(k => k+1)}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <a href={REMOTION_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        key={key}
        src={REMOTION_URL}
        className="flex-1 w-full border-0 rounded-b-lg"
        style={{ minHeight: "calc(100vh - 160px)" }}
        title="Remotion Studio"
      />
    </div>
  );
}
```

**Step 3: Build Studio page**

Create `dashboard/app/studio/page.tsx`:

```tsx
import { RemotionEmbed } from "@/components/studio/remotion-embed";
import { Film } from "lucide-react";

export default function StudioPage() {
  return (
    <div className="flex flex-col h-full -m-6">
      {/* Thin header bar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-2 bg-card">
        <Film className="w-4 h-4 text-primary" />
        <h1 className="text-sm font-semibold text-foreground">Remotion Studio</h1>
        <span className="text-xs text-muted-foreground ml-1">— Synthetic Video Compositions</span>
      </div>
      <div className="flex-1 p-0">
        <RemotionEmbed />
      </div>
    </div>
  );
}
```

**Step 4: Add env var to .env.local**

Add to `dashboard/.env.local` (create if not exists):

```env
NEXT_PUBLIC_REMOTION_URL=http://localhost:3000
```

**Step 5: Verify**

Open http://localhost:4000/studio — Remotion Studio should appear embedded inside the dashboard.

**Step 6: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add dashboard/
git commit -m "feat: embed Remotion Studio in dashboard /studio page"
```

---

## Phase 6 — Hyperedit Worker

### Task 8: Hyperedit Worker Scaffold

**Files:**
- Create: `hyperedit-worker/package.json`
- Create: `hyperedit-worker/tsconfig.json`
- Create: `hyperedit-worker/worker.ts`
- Create: `hyperedit-worker/obs-watcher.ts`
- Create: `hyperedit-worker/transcribe.ts`
- Create: `hyperedit-worker/planner.ts`
- Create: `hyperedit-worker/renderer.ts`
- Create: `hyperedit-worker/uploader.ts`

**Step 1: Create worker package.json**

Create `hyperedit-worker/package.json`:

```json
{
  "name": "hyperedit-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "tsx watch worker.ts",
    "start:prod": "tsx worker.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "chokidar": "^3.5.3",
    "openai": "^4.28.0",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.11.5"
  }
}
```

**Step 2: Install dependencies**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/hyperedit-worker"
npm install
```

**Step 3: Create tsconfig.json**

Create `hyperedit-worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create uploader.ts**

Create `hyperedit-worker/uploader.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { basename } from "path";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadToStorage(localPath: string, bucket: string, destPath?: string): Promise<string> {
  const fileName = destPath ?? basename(localPath);
  const fileBuffer = readFileSync(localPath);
  const mimeType = localPath.endsWith(".mp4") ? "video/mp4" : "video/x-matroska";

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
```

**Step 5: Create obs-watcher.ts**

Create `hyperedit-worker/obs-watcher.ts`:

```typescript
import chokidar from "chokidar";
import { createClient } from "@supabase/supabase-js";
import { uploadToStorage } from "./uploader";
import { basename } from "path";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OBS_FOLDER = process.env.OBS_HOT_FOLDER ?? "C:/OBS-Output/penthouse-papi";

export function startObsWatcher() {
  console.log(`[OBS Watcher] Watching: ${OBS_FOLDER}`);

  const watcher = chokidar.watch(OBS_FOLDER, {
    ignored: /^\./, persistent: true, awaitWriteFinish: { stabilityThreshold: 3000 }
  });

  watcher.on("add", async (filePath: string) => {
    if (!filePath.match(/\.(mp4|mkv|mov)$/i)) return;

    console.log(`[OBS Watcher] New recording detected: ${filePath}`);
    try {
      const publicUrl = await uploadToStorage(filePath, "source-videos", `obs/${basename(filePath)}`);
      console.log(`[OBS Watcher] Uploaded to: ${publicUrl}`);

      // Create a pending hyperedit request
      const { error } = await supabase.from("hyperedit_requests").insert({
        brand: process.env.DEFAULT_BRAND ?? "goldbackbond",
        status: "pending",
        request_payload: {
          source_videos: [{ url: publicUrl, type: "recording", priority: 1 }],
          target_profiles: [
            { platform: "instagram_reel", aspect_ratio: "9:16", max_duration_sec: 30, style: "fast_paced" },
            { platform: "youtube_short",  aspect_ratio: "9:16", max_duration_sec: 60, style: "clean" }
          ],
          brand: process.env.DEFAULT_BRAND ?? "goldbackbond",
          goals: ["hook_attention"],
          max_clips: 10,
          language: "en"
        }
      });

      if (error) console.error("[OBS Watcher] DB insert error:", error.message);
      else console.log("[OBS Watcher] Job created in queue.");
    } catch (err) {
      console.error("[OBS Watcher] Error:", err);
    }
  });
}
```

**Step 6: Create transcribe.ts**

Create `hyperedit-worker/transcribe.ts`:

```typescript
import OpenAI from "openai";
import { createReadStream } from "fs";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export async function transcribeVideo(localPath: string): Promise<TranscriptSegment[]> {
  console.log(`[Transcribe] Transcribing: ${localPath}`);

  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(localPath) as unknown as File,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  // @ts-ignore verbose_json includes segments
  const segments = transcription.segments ?? [];
  return segments.map((s: { start: number; end: number; text: string }) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));
}
```

**Step 7: Create planner.ts**

Create `hyperedit-worker/planner.ts`:

```typescript
import OpenAI from "openai";
import type { TranscriptSegment } from "./transcribe";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export interface ClipPlan {
  clip_id: string;
  title: string;
  platform_profile: string;
  start_time_sec: number;
  end_time_sec: number;
  transcript_segment: string;
}

export async function generateEditPlan(
  segments: TranscriptSegment[],
  targetProfiles: { platform: string; max_duration_sec: number }[],
  maxClips: number,
  brand: string
): Promise<ClipPlan[]> {
  const transcript = segments.map(s => `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] ${s.text}`).join("\n");

  const prompt = `You are a social media video editor for ${brand}.

Given this transcript with timestamps, identify the ${maxClips} most engaging moments.
Each moment should be suitable for short-form video (hooks, punchlines, insights, stories).

Transcript:
${transcript}

Target platforms: ${targetProfiles.map(p => `${p.platform} (max ${p.max_duration_sec}s)`).join(", ")}

Return a JSON array of clips. Each clip:
{
  "clip_id": "uuid-like-string",
  "title": "Short engaging title (under 60 chars)",
  "platform_profile": "platform name from targets",
  "start_time_sec": 0.0,
  "end_time_sec": 0.0,
  "transcript_segment": "exact quote from transcript"
}

Only return the JSON array. No markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: process.env.PLANNER_MODEL ?? "anthropic/claude-sonnet-4-5",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  try {
    return JSON.parse(content) as ClipPlan[];
  } catch {
    console.error("[Planner] Failed to parse LLM response:", content);
    return [];
  }
}
```

**Step 8: Create renderer.ts**

Create `hyperedit-worker/renderer.ts`:

```typescript
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import "dotenv/config";

const OUTPUT_DIR = process.env.CLIP_OUTPUT_DIR ?? "C:/Users/Troy/Chief OS/penthouse-papi/hyperedit-worker/output";

export interface RenderedClip {
  clip_id: string;
  localPath: string;
  duration_sec: number;
}

export function renderClip(
  sourceUrl: string,
  clipId: string,
  startSec: number,
  endSec: number,
  platformProfile: string
): RenderedClip {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const duration = endSec - startSec;
  const is916 = platformProfile.includes("reel") || platformProfile.includes("short");
  const outputPath = join(OUTPUT_DIR, `${clipId}.mp4`);

  // Build ffmpeg command
  const cropFilter = is916
    ? "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920"
    : "scale=1920:1080";

  const cmd = [
    "ffmpeg", "-y",
    "-ss", startSec.toString(),
    "-i", `"${sourceUrl}"`,
    "-t", duration.toString(),
    "-vf", `"${cropFilter}"`,
    "-c:v", "libx264", "-preset", "fast",
    "-c:a", "aac", "-b:a", "128k",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    `"${outputPath}"`
  ].join(" ");

  console.log(`[Renderer] Rendering clip ${clipId}...`);
  execSync(cmd, { stdio: "inherit" });

  return { clip_id: clipId, localPath: outputPath, duration_sec: duration };
}
```

**Step 9: Create worker.ts (main job loop)**

Create `hyperedit-worker/worker.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { startObsWatcher } from "./obs-watcher";
import { transcribeVideo } from "./transcribe";
import { generateEditPlan } from "./planner";
import { renderClip } from "./renderer";
import { uploadToStorage } from "./uploader";
import { randomUUID } from "crypto";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POLL_INTERVAL_MS = 5000;

async function processJob(job: { id: string; request_payload: any }) {
  console.log(`[Worker] Processing job ${job.id}`);

  // 1. Mark as planning
  await supabase.from("hyperedit_requests").update({ status: "planning" }).eq("id", job.id);

  const payload = job.request_payload;
  const sourceUrl = payload.source_videos?.[0]?.url;
  if (!sourceUrl) throw new Error("No source video URL");

  // 2. Transcribe (download first for local Whisper)
  // For remote URLs, pass the URL directly if supported, or download first
  const segments = await transcribeVideo(sourceUrl);

  // 3. Generate plan
  const clips = await generateEditPlan(
    segments,
    payload.target_profiles,
    payload.max_clips ?? 10,
    payload.brand
  );

  // 4. Save plan to DB
  const planId = randomUUID();
  await supabase.from("hyperedit_plans").insert({
    id: planId,
    request_id: job.id,
    plan_payload: { request_id: job.id, clips },
    version: 1
  });

  // 5. Mark as rendering
  await supabase.from("hyperedit_requests").update({ status: "rendering" }).eq("id", job.id);

  // 6. Render each clip
  for (const clip of clips) {
    try {
      const rendered = renderClip(sourceUrl, clip.clip_id, clip.start_time_sec, clip.end_time_sec, clip.platform_profile);
      const clipUrl  = await uploadToStorage(rendered.localPath, "rendered-clips", `${job.id}/${clip.clip_id}.mp4`);

      await supabase.from("hyperedit_clips").insert({
        id: clip.clip_id,
        plan_id: planId,
        platform_profile: clip.platform_profile,
        clip_title: clip.title,
        render_url: clipUrl,
        duration_sec: rendered.duration_sec,
        start_time_sec: clip.start_time_sec,
        end_time_sec: clip.end_time_sec,
        status: "ready"
      });
    } catch (err: unknown) {
      console.error(`[Worker] Clip ${clip.clip_id} failed:`, err);
      await supabase.from("hyperedit_clips").insert({
        id: clip.clip_id,
        plan_id: planId,
        platform_profile: clip.platform_profile,
        clip_title: clip.title,
        status: "failed",
        error: { message: err instanceof Error ? err.message : String(err) }
      });
    }
  }

  // 7. Mark job complete
  await supabase.from("hyperedit_requests").update({ status: "completed" }).eq("id", job.id);
  console.log(`[Worker] Job ${job.id} complete — ${clips.length} clips rendered.`);
}

async function pollJobs() {
  const { data: jobs, error } = await supabase
    .from("hyperedit_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) { console.error("[Worker] Poll error:", error.message); return; }
  if (!jobs || jobs.length === 0) return;

  try {
    await processJob(jobs[0]);
  } catch (err) {
    console.error(`[Worker] Job ${jobs[0].id} failed:`, err);
    await supabase.from("hyperedit_requests")
      .update({ status: "failed", error: { message: String(err) } })
      .eq("id", jobs[0].id);
  }
}

// Start OBS watcher + job polling loop
startObsWatcher();
console.log(`[Worker] Started. Polling every ${POLL_INTERVAL_MS}ms...`);
setInterval(pollJobs, POLL_INTERVAL_MS);
pollJobs(); // immediate first check
```

**Step 10: Create .env file for worker**

Create `hyperedit-worker/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
OPENROUTER_API_KEY=sk-or-v1-...
PLANNER_MODEL=anthropic/claude-sonnet-4-5
OBS_HOT_FOLDER=C:/OBS-Output/penthouse-papi
CLIP_OUTPUT_DIR=C:/Users/Troy/Chief OS/penthouse-papi/hyperedit-worker/output
DEFAULT_BRAND=goldbackbond
```

**Step 11: Add worker to launch.json**

Add to `C:\Users\Troy\.claude\.claude\launch.json` configurations array:

```json
{
  "name": "penthouse-papi-hyperedit-worker",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", "C:\\Users\\Troy\\Chief OS\\penthouse-papi\\hyperedit-worker", "run", "start"],
  "port": 4001
},
{
  "name": "penthouse-papi-dashboard",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", "C:\\Users\\Troy\\Chief OS\\penthouse-papi\\dashboard", "run", "dev"],
  "port": 4000
}
```

**Step 12: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add hyperedit-worker/
git commit -m "feat: add hyperedit worker with OBS watcher, transcriber, planner, renderer"
```

---

## Phase 7 — Jerry Operations Manual

### Task 9: Create Jerry Operations Manual

**Files:**
- Create: `docs/jerry-operations.md`
- Create: `dashboard/app/manual/page.tsx`
- Create: `dashboard/components/manual/manual-renderer.tsx`

**Step 1: Write the full manual**

Create `docs/jerry-operations.md`:

```markdown
# Penthouse Papi — Conductor's Operations Manual
**Role:** Jerry Martin Jr., Conductor · ChiefOS Media
**Version:** 1.0 · 2026-02-25
**Systems:** Antigravity · n8n · Supabase · GHL · Telegram · Penthouse Papi Dashboard

---

## 1. Mindset: You Are the Conductor, Not the Editor

You don't manually cut videos or write every caption. Your job is to tune and direct Penthouse Papi — the AI production engine — like a showrunner runs a TV studio.

- **Think in arcs:** Episodes, seasons, recurring segments.
- **Curate, don't create:** Review AI output, refine it, approve it.
- **Fix the machine, not just the output:** When something breaks, patch the template so it never breaks the same way again.
- **Your three brands, three tones:** GBB = serious/trustworthy. CoachAI = energetic/educational. OpenChief = founder/visionary.

---

## 2. Tools in Your Baton

| Tool | Purpose | How You Use It |
|------|---------|----------------|
| **Penthouse Papi Dashboard** | Mission control | Daily review, launch jobs, approve clips |
| **Antigravity** | Agent & code workspace | Build new skills, fix bugs, extend Papi |
| **n8n** (`n8n.megaversepro.app`) | Automation patchbay | Monitor workflows, rerun failed nodes |
| **Supabase** | Source of truth | Query concepts/calendar/assets tables |
| **GHL** | Distribution & CRM | Verify posts scheduled, leads tracked |
| **Telegram** | Your steering wheel | Approve/revise from your phone |
| **OBS** | Recording ingest | Record Zooms/podcasts → auto-feeds Hyperedit |

---

## 3. Daily Rhythm

### Morning (15 min)
- [ ] Open Dashboard → Command Center
- [ ] Check **Needs Approval** card — handle urgent items first
- [ ] Check **Hyperedit Jobs** panel — any failures? Click job → rerun if needed
- [ ] Open n8n → scan last 24h executions for errors (red nodes)
- [ ] Check Telegram for overnight notifications from Papi

### Midday (30 min)
- [ ] Work with Troy on new concepts — use `/concept [brand] [idea]` in Telegram
- [ ] Drop any new recordings: OBS → records automatically, or paste YouTube URL into `/hyperedit`
- [ ] Check GHL for any posts that need manual scheduling fixes

### Evening (10 min)
- [ ] Review Papi's daily performance snapshot (Dashboard → Analytics)
- [ ] Note top performer → log insight in shared doc
- [ ] Any pending approvals? Clear them before end of day

---

## 4. Weekly Ritual (60-90 min with Troy)

**Media Standup — every Monday morning**

Agenda:
1. **Review last week's performance** (top 3 posts per brand, bottom 3)
2. **Identify patterns** — what hooks worked? What fell flat?
3. **Plan this week's concepts** — Troy shares direction, you translate to Papi jobs
4. **Ship one improvement** — new prompt tweak, better template, new Remotion composition
5. **Log everything** in `docs/weekly-standup/YYYY-MM-DD.md`

---

## 5. Running a Concept End-to-End

1. **Intake:** `/concept goldbackbond 60-day launch campaign for real estate investors`
2. **Papi plans:** Review calendar in Dashboard → Calendar (30-60 day view)
3. **First asset review:** Telegram ping → `/review [asset_id]` → approve or `/revise [asset_id] "make hook shorter"`
4. **Batch approve:** Dashboard → Hyperedit → Approve All (for a set of clips)
5. **Scheduling:** n8n auto-maps approved assets to GHL locations and post times
6. **Go live:** Monitor first 24h metrics in Dashboard → Analytics

---

## 6. Hyperedit Workflow (Long-form → Clips)

1. **Record:** Use OBS (auto-detected) OR paste YouTube/Zoom URL into Dashboard → Hyperedit
2. **Configure:** Select platforms (Reels, Shorts, LinkedIn), max clips (10), brand
3. **Generate Plan:** Papi transcribes + LLM identifies best moments
4. **Review clips:** Clip table shows status (planning → rendering → ready)
5. **Preview:** Click ▶ on any ready clip
6. **Approve:** Approve All (batch) or clip-by-clip
7. **Schedule:** n8n maps each clip to a calendar day in GHL

**One long-form recording = one month of short-form content.**

---

## 7. Brand Guides

### Goldbackbond (GBB)
- **Tone:** Trustworthy, serious, aspirational. Never hype, always proof.
- **Content pillars:** Education, social proof, market context, investor stories
- **Off-limits:** Promises of guaranteed returns, aggressive CTAs, political commentary
- **Visual:** Gold accents (#FFD700), dark backgrounds, clean typography

### CoachAI Tech Camps
- **Tone:** Energetic, inclusive, empowering. Celebrate progress at all levels.
- **Content pillars:** Camp promos, student stories, lesson highlights, behind-the-scenes
- **Sensitive:** Respectful portrayal of ex-offender community stories — dignity first
- **Visual:** Bright, high-energy, bold colors

### OpenChief (Founder Content)
- **Tone:** Visionary, transparent, builder. Show the process, not just the outcome.
- **Content pillars:** Product updates, ecosystem insights, founder reflections, community
- **Off-limits:** Nothing too polished — authenticity over perfection

---

## 8. Telegram Commands

| Command | Example | Action |
|---------|---------|--------|
| `/concept [brand] [idea]` | `/concept gbb Series A launch` | Creates concept in Supabase, kicks off planning |
| `/review` | `/review` | Lists all assets awaiting approval |
| `/approve [id]` | `/approve abc123` | Approves asset, triggers n8n distribution |
| `/revise [id] "[feedback]"` | `/revise abc123 "hook too slow"` | Sends asset back for revision |
| `/clips [brand] [url] [n]` | `/clips gbb https://yt.be/xyz 20` | Creates Hyperedit job from YouTube URL |
| `/performance` | `/performance` | Last 7 days performance summary |
| `/status` | `/status` | System health check |

---

## 9. Incident Handling

### Off-Brand Post Published
1. Immediately unpublish in GHL
2. In Dashboard → Concepts → find asset → mark `flagged`
3. Write postmortem: what prompt/template generated this?
4. Patch the template in Antigravity
5. Add a regression note to n8n workflow description

### Render Failed
1. Dashboard → Hyperedit → find failed clip (red badge)
2. Check error detail (hover/click the badge)
3. Common fixes:
   - `ffmpeg not found` → restart worker, check ffmpeg in PATH
   - `Whisper API error` → check OPENAI_API_KEY balance
   - `Supabase upload failed` → check storage bucket permissions
4. Click "Retry" on the job, or delete and re-submit

### n8n Node Failure
1. Go to `n8n.megaversepro.app` → Executions
2. Find failed run (red) → click → identify failing node
3. Check the error message (usually API key, format mismatch, or timeout)
4. Fix the node → click "Retry failed execution"
5. If systematic: update the workflow template and document the fix

---

## 10. First 30 Days Roadmap

**Week 1 — Get Comfortable**
- [ ] Walk through a full concept → campaign cycle for OpenChief
- [ ] Produce 1 Remotion synthetic video, 1 hyperedit clip set
- [ ] Approve via Telegram, verify it hits GHL sandbox
- [ ] Read the full PRD (`Penthouse Papi.ContentCreation.PRD.md`)

**Week 2 — Own Goldbackbond**
- [ ] Take a GBB long-form recording end-to-end through Hyperedit
- [ ] Produce 5-10 clips, review pacing and brand alignment
- [ ] Run first GBB campaign on sandbox GHL accounts
- [ ] Daily log: what worked in the clips, what felt off

**Week 3 — Launch CoachAI**
- [ ] Build first CoachAI Tech Camp promo using Remotion templates
- [ ] Create camp launch n8n workflow from template
- [ ] Launch promo series to real CoachAI accounts
- [ ] Document "best hooks" from both brands in shared doc

**Week 4 — Propose + Ship an Improvement**
- [ ] Run first full Media Standup with Troy
- [ ] Identify one thing Papi does that wastes time or produces weak output
- [ ] Propose a fix (new skill, better prompt, better template)
- [ ] Ship it in Antigravity with tests — your first solo feature
```

**Step 2: Create manual renderer component**

Create `dashboard/components/manual/manual-renderer.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ManualRendererProps {
  content: string;
}

export function ManualRenderer({ content }: ManualRendererProps) {
  return (
    <div className={cn(
      "prose prose-invert prose-sm max-w-none",
      "prose-headings:text-foreground prose-headings:font-semibold",
      "prose-h1:text-xl prose-h2:text-base prose-h3:text-sm",
      "prose-p:text-muted-foreground prose-p:leading-relaxed",
      "prose-code:bg-secondary prose-code:text-primary prose-code:px-1 prose-code:rounded",
      "prose-pre:bg-secondary prose-pre:border prose-pre:border-border",
      "prose-table:text-sm prose-th:text-muted-foreground prose-td:text-foreground",
      "prose-li:text-muted-foreground prose-a:text-primary",
      "prose-strong:text-foreground",
      "prose-hr:border-border"
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
```

**Step 3: Install react-markdown**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi/dashboard"
npm install react-markdown @tailwindcss/typography
```

Add to `dashboard/tailwind.config.ts` plugins:
```typescript
plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
```

**Step 4: Build manual page**

Create `dashboard/app/manual/page.tsx`:

```tsx
import { readFileSync } from "fs";
import { join } from "path";
import { ManualRenderer } from "@/components/manual/manual-renderer";
import { BookOpen } from "lucide-react";

export default function ManualPage() {
  // Read manual from docs/ at build/request time
  const manualPath = join(process.cwd(), "..", "docs", "jerry-operations.md");
  let content = "# Manual not found\n\nEnsure `docs/jerry-operations.md` exists.";
  try { content = readFileSync(manualPath, "utf-8"); } catch {}

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Conductor's Manual</h1>
          <p className="text-sm text-muted-foreground">Jerry Martin Jr. — ChiefOS Media Operations</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg p-6">
        <ManualRenderer content={content} />
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add docs/jerry-operations.md dashboard/
git commit -m "feat: add Jerry operations manual and /manual rendered page"
```

---

## Phase 8 — Wire Up launch.json + Final Integration

### Task 10: Update launch.json and Verify All Services

**Step 1: Update launch.json with new servers**

Edit `C:\Users\Troy\.claude\.claude\launch.json` — add at beginning of configurations array:

```json
{"name": "penthouse-papi-dashboard",        "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "C:\\Users\\Troy\\Chief OS\\penthouse-papi\\dashboard",        "run", "dev"],   "port": 4000},
{"name": "penthouse-papi-hyperedit-worker", "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "C:\\Users\\Troy\\Chief OS\\penthouse-papi\\hyperedit-worker", "run", "start"], "port": 4001},
```

**Step 2: Create .env.local for dashboard**

Create `dashboard/.env.local` (copy from .env.local.example, fill in actual values):

```bash
cp "C:/Users/Troy/Chief OS/penthouse-papi/dashboard/.env.local.example" \
   "C:/Users/Troy/Chief OS/penthouse-papi/dashboard/.env.local"
```

Then fill in Supabase URL, anon key, and Remotion URL.

**Step 3: Create .env for worker**

```bash
cp "C:/Users/Troy/Chief OS/penthouse-papi/hyperedit-worker/.env.example" \
   "C:/Users/Troy/Chief OS/penthouse-papi/hyperedit-worker/.env"
```

Fill in Supabase service role key, OpenAI API key, OpenRouter API key.

**Step 4: Run schema-v2.sql against Supabase**

In your Supabase dashboard SQL editor (or via CLI):

```bash
# Via Supabase CLI (if installed)
supabase db execute --file supabase/schema-v2.sql

# OR: copy contents of schema-v2.sql and run in Supabase SQL editor
```

**Step 5: Start both new servers**

Start dashboard:
```
preview_start "penthouse-papi-dashboard"
```

Start worker:
```
preview_start "penthouse-papi-hyperedit-worker"
```

**Step 6: Final verification checklist**

- [ ] http://localhost:4000 → Command Center loads with dark studio theme
- [ ] http://localhost:4000/hyperedit → Drop zone + clip table visible
- [ ] http://localhost:4000/studio → Remotion Studio embedded from localhost:3000
- [ ] http://localhost:4000/manual → Jerry's operations manual renders
- [ ] http://localhost:4000/calendar → Calendar page (stub, shows "coming soon" if not built yet)
- [ ] Hyperedit worker logs show "Started. Polling every 5000ms..."
- [ ] OBS hot folder watcher shows "Watching: C:/OBS-Output/penthouse-papi"

**Step 7: Final commit**

```bash
cd "C:/Users/Troy/Chief OS/penthouse-papi"
git add .
git commit -m "feat: complete Penthouse Papi dashboard + Hyperedit worker v1

- Next.js 14 dark studio dashboard (port 4000)
- Command Center, Hyperedit, Studio, Manual pages
- Hyperedit worker with OBS watcher, Whisper transcription, LLM planner, ffmpeg renderer
- Supabase schema-v2 (hyperedit_requests, hyperedit_plans, hyperedit_clips)
- Jerry operations manual (docs/ + /manual page)
- Full integration with existing Remotion Studio (port 3000)"
```

---

## Summary

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1 | 1-3  | Next.js scaffold + dark design system + sidebar layout |
| 2 | 4    | Supabase schema-v2 + TypeScript types + Supabase client |
| 3 | 5    | Command Center page |
| 4 | 6    | Hyperedit page |
| 5 | 7    | Studio embed page |
| 6 | 8    | Hyperedit worker (OBS + Whisper + LLM + ffmpeg) |
| 7 | 9    | Jerry manual + /manual page |
| 8 | 10   | launch.json + env setup + final integration |

**All existing systems unchanged:** Remotion Studio (port 3000), n8n, Tiledesk, chiefos-api.
