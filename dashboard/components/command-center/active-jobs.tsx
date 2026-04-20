"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Scissors, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useBrand, matchesBrand } from "@/lib/brand-context";
import type { HypereditJob } from "@/lib/hyperedit/types";


const statusConfig = {
  queued: {
    label: "Queued",
    color: "#94A3B8",
    icon: Loader2,
    animate: false,
  },
  planning: {
    label: "Planning",
    color: "#F59E0B",
    icon: Loader2,
    animate: true,
  },
  generating: {
    label: "AI Generating",
    color: "#FFD700",
    icon: Loader2,
    animate: true,
  },
  transcribing: {
    label: "Transcribing",
    color: "#6C63FF",
    icon: Loader2,
    animate: true,
  },
  rendering: {
    label: "Rendering",
    color: "#6C63FF",
    icon: Scissors,
    animate: false,
  },
  ready: {
    label: "Ready",
    color: "#22C55E",
    icon: CheckCircle2,
    animate: false,
  },
  failed: {
    label: "Failed",
    color: "#EF4444",
    icon: AlertCircle,
    animate: false,
  },
};

const brandColors: Record<string, string> = {
  GBB: "#FFD700",
  COACH: "#22C55E",
  OPEN: "#6C63FF",
};

export function ActiveJobs() {
  const [jobs, setJobs] = useState<HypereditJob[]>([]);
  const brand = useBrand();

  useEffect(() => {
    fetch("/api/hyperedit/jobs")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const list = data?.jobs ?? (Array.isArray(data) ? data : []);
        setJobs(list);
      })
      .catch(() => {});
  }, []);

  const filteredJobs = jobs.filter((j) => matchesBrand(brand, j.brand));

  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pp-text">
          Active Hyperedit Jobs
        </h3>
        <span className="rounded-full bg-pp-purple/10 px-2.5 py-0.5 text-xs font-bold text-pp-purple">
          {filteredJobs.filter((j) => j.status !== "ready" && j.status !== "failed").length} running
        </span>
      </div>

      <div className="space-y-3">
        {filteredJobs.map((job) => {
          const cfg = statusConfig[job.status];
          const StatusIcon = cfg.icon;
          const brandColor = brandColors[job.brand.toUpperCase()] || "#6C63FF";

          return (
            <div
              key={job.id}
              className="group rounded-lg border border-pp-border/50 bg-[#0A0A0F]/50 p-4 transition-all duration-200 hover:border-pp-border"
            >
              {/* Top row */}
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-pp-text">
                    {job.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: brandColor + "15",
                        color: brandColor,
                      }}
                    >
                      {job.brand.toUpperCase()}
                    </span>
                    {job.clips > 0 && (
                      <span className="text-[10px] text-pp-muted">
                        {job.clips} clips
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                  <StatusIcon
                    className={cn("h-3.5 w-3.5", cfg.animate && "animate-spin")}
                  />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-pp-border/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${job.progress}%`,
                    background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                    boxShadow: `0 0 8px ${cfg.color}44`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <p className="py-4 text-center text-xs text-pp-muted">
            No active jobs for this brand.
          </p>
        )}
      </div>
    </div>
  );
}
