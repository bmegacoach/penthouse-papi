"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Loader2, CheckCircle2, AlertCircle, Skull, Plus } from "lucide-react";
import type { ResearchItem } from "@/lib/memory/types";

const statusIcons = { queued: Search, active: Loader2, complete: CheckCircle2, failed: AlertCircle, dead: Skull };
const statusColors = { queued: "#94A3B8", active: "#6C63FF", complete: "#22C55E", failed: "#F59E0B", dead: "#EF4444" };

export function ResearchPanel() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => { fetch("/api/memory/research").then(r => r.json()).then(data => setItems(data.items || [])).catch(() => {}); };
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    await fetch("/api/memory/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setQuestion("");
    setShowAdd(false);
    setSubmitting(false);
    refresh();
  };

  const counts = {
    active: items.filter(i => i.status === "active").length,
    queued: items.filter(i => i.status === "queued").length,
    failed: items.filter(i => i.status === "failed" || i.status === "dead").length,
  };

  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-pp-text">Research Queue</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-md bg-pp-purple/10 px-2 py-1 text-[10px] font-bold text-pp-purple hover:bg-pp-purple/20 transition-colors">
          <Plus className="h-3 w-3" />New
        </button>
      </div>
      <div className="mb-4 flex items-center gap-3 text-[10px]">
        <span className="text-pp-purple font-bold">{counts.active} active</span>
        <span className="text-pp-muted">{counts.queued} queued</span>
        {counts.failed > 0 && <span className="text-pp-error">{counts.failed} failed</span>}
      </div>
      {showAdd && (
        <div className="mb-4 space-y-2 rounded-lg border border-pp-border/50 p-3">
          <input type="text" placeholder="Research question..." value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/40 focus:border-pp-purple/50 focus:outline-none" autoFocus />
          <button onClick={submit} disabled={submitting || !question.trim()} className="w-full rounded-lg bg-pp-purple py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Submitting..." : "Submit Research"}</button>
        </div>
      )}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-pp-muted py-4 text-center">No research items in queue</p>
        ) : items.map((item) => {
          const Icon = statusIcons[item.status] || Search;
          const color = statusColors[item.status] || "#94A3B8";
          return (
            <div key={item.id} className="rounded-lg border border-pp-border/50 p-3 hover:bg-pp-surface-raised transition-colors">
              <div className="flex items-start gap-2">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", item.status === "active" && "animate-spin")} style={{ color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-pp-text truncate">{item.question}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-pp-muted">
                    <span style={{ color }} className="font-bold">{item.status}</span>
                    <span>{item.priority}</span>
                    {item.retries > 0 && <span>retry {item.retries}/3</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
