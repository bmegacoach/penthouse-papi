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

  if (loading) return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;

  if (!data?.notes && (!data?.events || data.events.length === 0)) {
    return (
      <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center grid-pattern rounded-lg p-12">
          <p className="text-sm font-medium text-pp-muted">No activity today yet. Daily notes will appear here as agents work.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                        )}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data?.notes && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-pp-text">Daily Notes</h3>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">{data.notes}</pre>
        </div>
      )}
    </div>
  );
}
