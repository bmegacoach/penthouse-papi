"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Video,
  Clock,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Scissors,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/command-center/stat-card";
import { CalendarStrip } from "@/components/command-center/calendar-strip";
import { QuickActions } from "@/components/command-center/quick-actions";
import { ActiveJobs } from "@/components/command-center/active-jobs";
import { FleetStatus } from "@/components/command-center/fleet-status";

interface Stats {
  completed_today: number;
  in_queue: number;
  rendering: number;
  approved: number;
  calendar: { date: string; video: number; image: number; copy: number }[];
  research_active: number;
  research_queued: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

export default function CommandCenter() {
  const [stats, setStats] = useState<Stats>({
    completed_today: 0,
    in_queue: 0,
    rendering: 0,
    approved: 0,
    calendar: [],
    research_active: 0,
    research_queued: 0,
  });
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/analytics/funnel").then(r => r.json()).then(d => setFunnel(d.stages || [])).catch(() => {});
  }, []);

  const funnelLinks: Record<string, string> = {
    Concepts: "/concepts",
    Jobs: "/hyperedit",
    Clips: "/studio",
    Scheduled: "/calendar",
    Published: "/analytics",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-pp-muted">
          Content pipeline overview — all brands
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-up fade-up-2">
        <StatCard
          label="Today's Posts"
          value={stats.completed_today}
          change={`${stats.research_active} research active`}
          changeType="up"
          icon={Send}
          accentColor="#6C63FF"
        />
        <StatCard
          label="In Queue"
          value={stats.in_queue}
          change={`${stats.research_queued} research pending`}
          changeType="neutral"
          icon={Clock}
          accentColor="#F59E0B"
          glowClass="glow-gold"
        />
        <StatCard
          label="Rendering"
          value={stats.rendering}
          change="Active jobs"
          changeType="neutral"
          icon={Video}
          accentColor="#6C63FF"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          change="Ready to schedule"
          changeType="up"
          icon={CheckCircle2}
          accentColor="#22C55E"
          glowClass="glow-success"
        />
      </div>

      {/* Pipeline Funnel */}
      {funnel.length > 0 && (
        <div className="fade-up fade-up-3 rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-muted">Pipeline Health</h3>
          <div className="flex items-center gap-2">
            {funnel.map((stage, i) => (
              <div key={stage.stage} className="flex items-center gap-2">
                <Link
                  href={funnelLinks[stage.stage] || "/"}
                  className="group flex flex-col items-center gap-1 rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-4 py-3 transition-all hover:border-pp-border"
                >
                  <span className="text-lg font-bold tabular-nums" style={{ color: stage.color }}>
                    {stage.count}
                  </span>
                  <span className="text-[10px] text-pp-muted group-hover:text-pp-text transition-colors">
                    {stage.stage}
                  </span>
                </Link>
                {i < funnel.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-pp-muted/40 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar strip */}
      <div className="fade-up fade-up-4">
        <CalendarStrip calendarData={stats.calendar} />
      </div>

      {/* Bottom grid: Jobs + Actions + Fleet */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 fade-up fade-up-5">
          <ActiveJobs />
        </div>
        <div className="lg:col-span-1 fade-up fade-up-6">
          <QuickActions />
        </div>
        <div className="lg:col-span-1 fade-up fade-up-7">
          <FleetStatus />
        </div>
      </div>
    </div>
  );
}
