"use client";

import { useEffect, useState } from "react";
import { Shield, TrendingUp } from "lucide-react";
import type { TacitRule } from "@/lib/memory/types";

export function TacitRules() {
  const [rules, setRules] = useState<TacitRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory/tacit").then(r => r.json()).then(data => setRules(data.rules || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center grid-pattern rounded-lg p-12">
          <Shield className="h-8 w-8 text-pp-muted/40" />
          <p className="text-sm font-medium text-pp-muted">No tacit rules yet. Rules emerge from pattern detection during nightly consolidation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.title} className="rounded-xl border border-pp-border bg-pp-surface p-5 transition-all hover:border-pp-purple/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-pp-purple" />
            <span className="text-sm font-semibold text-pp-text">{rule.title}</span>
            <div className="flex items-center gap-1 rounded bg-pp-purple/10 px-2 py-0.5">
              <TrendingUp className="h-3 w-3 text-pp-purple" />
              <span className="text-[10px] font-bold text-pp-purple">{rule.confidence}x confirmed</span>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">{rule.content}</pre>
          <div className="mt-3 text-[10px] text-pp-muted/50">
            Updated: {rule.updated_at?.split("T")[0] || "unknown"}
            {rule.origin_daily_note && ` | Origin: ${rule.origin_daily_note}`}
          </div>
        </div>
      ))}
    </div>
  );
}
