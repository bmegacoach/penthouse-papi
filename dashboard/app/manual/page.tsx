"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  Clock,
  CheckSquare,
  AlertTriangle,
  Terminal,
  Calendar,
  Zap,
  Users,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: typeof BookOpen;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    id: "mindset",
    title: "Mindset",
    icon: Zap,
    content: [
      "You are the Conductor, not the editor. Your job is to direct the AI agents, review their output, and approve content for distribution.",
      "Think of yourself as a music conductor: you don't play every instrument, but you ensure the orchestra plays in harmony.",
      "Your three core responsibilities: (1) Feed concepts into the pipeline, (2) Review and approve AI-generated content, (3) Ensure brand consistency across all output.",
    ],
  },
  {
    id: "tools",
    title: "Tools in Your Baton",
    icon: Terminal,
    content: [
      "Penthouse Papi Dashboard (this app) - Your command center for all content operations",
      "Hyperedit - Video processing pipeline: drop a long-form video, get platform-ready clips",
      "Remotion Studio - Synthetic video creation with templates and compositions",
      "n8n - Automation workflows connecting all services together",
      "GoHighLevel - Distribution and scheduling to social platforms",
      "Telegram Bot - Mobile notifications and quick approvals via /review, /approve commands",
    ],
  },
  {
    id: "daily",
    title: "Daily Rhythm",
    icon: Clock,
    content: [
      "MORNING (9 AM): Check Command Center dashboard. Review overnight renders. Approve or revise pending content.",
      "MIDDAY (12 PM): Submit 2-3 new concepts via /concepts page. Tag with brand and content type. Priority concepts get P1 tag.",
      "AFTERNOON (3 PM): Review Hyperedit clip output. Check analytics for yesterday's posts. Flag any brand inconsistencies.",
      "EVENING (6 PM): Quick scan of notifications. Approve anything urgent for next-day publishing. Log any insights to Memory system.",
    ],
  },
  {
    id: "weekly",
    title: "Weekly Ritual",
    icon: Calendar,
    content: [
      "Monday: 60-minute Media Standup with Troy. Review last week's performance. Set this week's content targets.",
      "Wednesday: Mid-week content audit. Check pipeline health. Ensure all brands have 3+ posts scheduled for the rest of the week.",
      "Friday: Weekly wrap-up. Archive completed concepts. Review analytics. Submit weekend content (pre-scheduled).",
    ],
  },
  {
    id: "concepts",
    title: "Running a Concept",
    icon: CheckSquare,
    content: [
      "Step 1: Create concept in /concepts with title, description, brand, and tags",
      "Step 2: Advance status from Draft to Review when ready for AI processing",
      "Step 3: AI agents pick up Review concepts and generate content (video scripts, image prompts, copy)",
      "Step 4: Review generated content in Hyperedit (for video) or Studio (for synthetic)",
      "Step 5: Approve content - it flows to the Calendar for scheduling",
      "Step 6: Content auto-publishes via GHL at scheduled time. Monitor analytics post-publish.",
    ],
  },
  {
    id: "hyperedit",
    title: "Hyperedit Workflow",
    icon: Zap,
    content: [
      "1. Record or download long-form video (OBS, interviews, podcasts)",
      "2. Go to /hyperedit > New Job > paste URL or upload file",
      "3. Select platform targets: Reels, Shorts, LinkedIn, Twitter",
      "4. Set max clips (3-8 recommended) and brand",
      "5. Submit - the pipeline transcribes, plans clips, and renders",
      "6. Review each clip on the job detail page",
      "7. Approve All or individually approve/reject clips",
      "8. Approved clips flow to Calendar for scheduling",
    ],
  },
  {
    id: "brands",
    title: "Brand Guides",
    icon: Users,
    content: [
      "GBB (Goldbackbond): Authoritative, data-driven, professional. Gold (#FFD700) accent. Target: investors, finance professionals. Tone: confident expertise.",
      "CoachAI (Tech Camps): Energetic, accessible, educational. Green (#22C55E) accent. Target: parents, students, educators. Tone: enthusiastic mentor.",
      "OpenChief: Technical, builder-focused, forward-thinking. Purple (#6C63FF) accent. Target: developers, technical leaders. Tone: knowledgeable peer.",
    ],
  },
  {
    id: "telegram",
    title: "Telegram Commands",
    icon: MessageSquare,
    content: [
      "/concept <title> - Quick-create a concept from mobile",
      "/review - List all content pending your review",
      "/approve <id> - Approve a piece of content",
      "/revise <id> <notes> - Send content back for revision with feedback",
      "/clips <job-id> - View clip previews for a Hyperedit job",
      "/performance - Quick stats: today's posts, engagement, queue depth",
    ],
  },
  {
    id: "incidents",
    title: "Incident Handling",
    icon: AlertTriangle,
    content: [
      "Off-brand post: Immediately pause the scheduled post in GHL. Flag the concept as 'review' in dashboard. Notify Troy via Telegram.",
      "Broken render: Check Hyperedit job detail for error message. If ffmpeg error, retry the job. If persistent, escalate to Troy.",
      "Failed n8n node: Check n8n dashboard for the failed workflow. Most failures are API timeouts - retry the workflow. If auth error, check API keys in Settings.",
      "Stalled pipeline: Check Fleet Status in Command Center. If an agent is offline, the heartbeat system will auto-notify. Wait for auto-recovery or escalate.",
    ],
  },
  {
    id: "first30",
    title: "First 30 Days",
    icon: Calendar,
    content: [
      "Week 1: Familiarize with dashboard, create 5 test concepts, run 2 Hyperedit jobs, review output quality",
      "Week 2: Establish daily rhythm, hit 3 posts/day target across all brands, learn Telegram commands",
      "Week 3: Optimize workflow, identify content gaps, start using analytics to guide concept creation",
      "Week 4: Full autonomy, 5 posts/day target, weekly reporting to Troy, propose content strategy improvements",
    ],
  },
];

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState("mindset");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery
    ? SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : SECTIONS;

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">Operations Manual</h1>
        <p className="mt-1 text-sm text-pp-muted">
          Jerry&apos;s guide to running the content machine
        </p>
      </div>

      {/* Search */}
      <div className="fade-up fade-up-2">
        <div className="flex items-center gap-2 rounded-lg border border-pp-border bg-pp-surface px-3 py-2">
          <Search className="h-4 w-4 text-pp-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manual..."
            className="flex-1 bg-transparent text-sm text-pp-text placeholder:text-pp-muted/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Section nav */}
        <nav className="fade-up fade-up-3 space-y-1">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
                activeSection === section.id
                  ? "bg-pp-purple/10 text-pp-purple font-medium"
                  : "text-pp-muted hover:bg-pp-surface hover:text-pp-text"
              )}
            >
              <section.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
              {activeSection === section.id && (
                <ChevronRight className="ml-auto h-3 w-3" />
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="fade-up fade-up-4 rounded-xl border border-pp-border bg-pp-surface p-6">
          {currentSection ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pp-purple/15">
                  <currentSection.icon className="h-5 w-5 text-pp-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-pp-text">{currentSection.title}</h2>
                  <p className="text-xs text-pp-muted">Section {SECTIONS.indexOf(currentSection) + 1} of {SECTIONS.length}</p>
                </div>
              </div>
              <div className="space-y-4">
                {currentSection.content.map((paragraph, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-4 py-3"
                  >
                    <p className="text-sm leading-relaxed text-pp-text/90">
                      {paragraph}
                    </p>
                  </div>
                ))}
              </div>
              {/* Nav arrows */}
              <div className="mt-6 flex items-center justify-between border-t border-pp-border pt-4">
                {SECTIONS.indexOf(currentSection) > 0 ? (
                  <button
                    onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(currentSection) - 1].id)}
                    className="text-xs text-pp-muted hover:text-pp-purple transition-colors"
                  >
                    Previous: {SECTIONS[SECTIONS.indexOf(currentSection) - 1].title}
                  </button>
                ) : <span />}
                {SECTIONS.indexOf(currentSection) < SECTIONS.length - 1 ? (
                  <button
                    onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(currentSection) + 1].id)}
                    className="text-xs text-pp-purple hover:text-pp-purple/80 transition-colors"
                  >
                    Next: {SECTIONS[SECTIONS.indexOf(currentSection) + 1].title} &rarr;
                  </button>
                ) : <span />}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <BookOpen className="h-10 w-10 text-pp-muted/40" />
              <p className="text-sm text-pp-muted">Select a section to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
