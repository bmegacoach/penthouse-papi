"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Video,
  Clock,
  CheckCircle2,
} from "lucide-react";
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

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

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
          change="+3 from yesterday"
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
          change="~14 min remaining"
          changeType="neutral"
          icon={Video}
          accentColor="#6C63FF"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          change="This week"
          changeType="up"
          icon={CheckCircle2}
          accentColor="#22C55E"
          glowClass="glow-success"
        />
      </div>

      {/* Calendar strip */}
      <div className="fade-up fade-up-3">
        <CalendarStrip calendarData={stats.calendar} />
      </div>

      {/* Bottom grid: Jobs + Actions + Fleet */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 fade-up fade-up-4">
          <ActiveJobs />
        </div>
        <div className="lg:col-span-1 fade-up fade-up-5">
          <QuickActions />
        </div>
        <div className="lg:col-span-1 fade-up fade-up-6">
          <FleetStatus />
        </div>
      </div>
    </div>
  );
}
