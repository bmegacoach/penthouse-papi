"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Video,
  Image,
  FileText,
  Brain,
  Eye,
  ThumbsUp,
  Share2,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface FunnelData {
  stages: FunnelStage[];
  conversionRates: { from: string; to: string; rate: number }[];
}

interface PerformanceData {
  totalConcepts: number;
  totalJobs: number;
  totalEntries: number;
  byType: { video: number; image: number; copy: number };
  byPlatform: Record<string, number>;
  byStatus: { scheduled: number; published: number; missed: number };
  conceptsByStatus: { draft: number; review: number; approved: number; published: number };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/analytics/funnel").then(r => r.json()).then(setFunnel).catch(() => {});
    fetch("/api/analytics/performance").then(r => r.json()).then(setPerf).catch(() => {});
  }, []);

  const totalContent = (perf?.byType.video ?? 0) + (perf?.byType.image ?? 0) + (perf?.byType.copy ?? 0);
  const maxType = Math.max(perf?.byType.video ?? 0, perf?.byType.image ?? 0, perf?.byType.copy ?? 0, 1);
  const maxFunnel = Math.max(...(funnel?.stages.map(s => s.count) ?? [1]));

  const triggerDigest = async () => {
    setDigestLoading(true);
    await fetch("/api/analytics/performance?digest=true").catch(() => {});
    setDigestLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="fade-up fade-up-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pp-text">Analytics</h1>
          <p className="mt-1 text-sm text-pp-muted">
            Pipeline metrics and content performance across all brands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerDigest}
            disabled={digestLoading}
            className="flex items-center gap-2 rounded-lg border border-pp-border px-3 py-1.5 text-xs text-pp-muted hover:text-pp-text transition-colors disabled:opacity-50"
            title="Generate analytics digest to Memory"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", digestLoading && "animate-spin")} />
            Digest to Memory
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-pp-border bg-pp-surface p-1">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  period === p ? "bg-pp-purple/15 text-pp-purple" : "text-pp-muted hover:text-pp-text"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="fade-up fade-up-2 rounded-xl border border-pp-border bg-pp-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-pp-text">Content Pipeline Funnel</h3>
        {funnel ? (
          <div className="space-y-3">
            {funnel.stages.map((stage, i) => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-pp-text">{stage.stage}</span>
                    {funnel.conversionRates[i - 1] && (
                      <span className="text-[10px] text-pp-muted">
                        ({funnel.conversionRates[i - 1].rate}% from {funnel.conversionRates[i - 1].from})
                      </span>
                    )}
                  </div>
                  <span className="font-bold tabular-nums text-pp-text">{stage.count}</span>
                </div>
                <div className="h-3 rounded-full bg-pp-border/50">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max((stage.count / maxFunnel) * 100, 2)}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-pp-muted">Loading funnel data...</p>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-up fade-up-3">
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6C63FF15]">
              <BarChart3 className="h-[18px] w-[18px] text-pp-purple" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-pp-text">{totalContent}</div>
          <div className="text-xs text-pp-muted">Content Produced</div>
        </div>
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22C55E15]">
              <ThumbsUp className="h-[18px] w-[18px] text-pp-success" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-pp-text">{perf?.byStatus.published ?? 0}</div>
          <div className="text-xs text-pp-muted">Published</div>
        </div>
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F615]">
              <Eye className="h-[18px] w-[18px] text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-pp-text">{perf?.byStatus.scheduled ?? 0}</div>
          <div className="text-xs text-pp-muted">Scheduled</div>
        </div>
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFD70015]">
              <Brain className="h-[18px] w-[18px] text-pp-gold" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-pp-text">{perf?.totalConcepts ?? 0}</div>
          <div className="text-xs text-pp-muted">Total Concepts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Content type breakdown */}
        <div className="fade-up fade-up-4 rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-pp-text">Content by Type</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-pp-muted">
                  <Video className="h-3.5 w-3.5 text-pp-purple" /> Video
                </div>
                <span className="font-bold tabular-nums text-pp-text">{perf?.byType.video ?? 0}</span>
              </div>
              <div className="h-2 rounded-full bg-pp-border">
                <div className="h-full rounded-full bg-pp-purple transition-all duration-500" style={{ width: `${((perf?.byType.video ?? 0) / maxType) * 100}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-pp-muted">
                  <Image className="h-3.5 w-3.5 text-pp-gold" /> Image
                </div>
                <span className="font-bold tabular-nums text-pp-text">{perf?.byType.image ?? 0}</span>
              </div>
              <div className="h-2 rounded-full bg-pp-border">
                <div className="h-full rounded-full bg-pp-gold transition-all duration-500" style={{ width: `${((perf?.byType.image ?? 0) / maxType) * 100}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-pp-muted">
                  <FileText className="h-3.5 w-3.5 text-pp-success" /> Copy
                </div>
                <span className="font-bold tabular-nums text-pp-text">{perf?.byType.copy ?? 0}</span>
              </div>
              <div className="h-2 rounded-full bg-pp-border">
                <div className="h-full rounded-full bg-pp-success transition-all duration-500" style={{ width: `${((perf?.byType.copy ?? 0) / maxType) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="fade-up fade-up-5 rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-pp-text">Content by Platform</h3>
          {perf && Object.keys(perf.byPlatform).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(perf.byPlatform).sort(([, a], [, b]) => b - a).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-4 py-3">
                  <span className="text-xs text-pp-muted capitalize">{platform}</span>
                  <span className="text-sm font-bold tabular-nums text-pp-text">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-pp-muted">
              No platform data yet — schedule content to see breakdowns
            </div>
          )}
        </div>
      </div>

      {/* Concept status breakdown */}
      <div className="fade-up fade-up-6 rounded-xl border border-pp-border bg-pp-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-pp-text">Concept Pipeline Status</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {perf && Object.entries(perf.conceptsByStatus).map(([status, count]) => {
            const colors: Record<string, string> = {
              draft: "#9CA3AF",
              review: "#F59E0B",
              approved: "#3B82F6",
              published: "#22C55E",
            };
            return (
              <div key={status} className="rounded-lg border border-pp-border/50 bg-[#0A0A0F] p-4 text-center">
                <div className="text-2xl font-bold tabular-nums" style={{ color: colors[status] }}>{count}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-pp-muted">{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
