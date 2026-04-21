"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight, Shield, Zap } from "lucide-react";

interface ScenarioIndexItem {
  id: string;
  created_at: string;
  namespace: string;
  scenario_title: string;
  scenario_type: string;
  simulation_mode: string;
  confidence_band: string;
  run_type: string;
}

interface SavedScenariosProps {
  onSelect: (id: string) => void;
  refreshTrigger?: number;
}

const confidenceDot: Record<string, string> = {
  very_low: "bg-red-400",
  low: "bg-pp-error",
  medium: "bg-pp-warning",
  high: "bg-pp-success",
  very_high: "bg-emerald-400",
};

const typeIcon: Record<string, React.ElementType> = {
  security: Shield,
};

export function SavedScenarios({ onSelect, refreshTrigger }: SavedScenariosProps) {
  const [scenarios, setScenarios] = useState<ScenarioIndexItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/simulation")
      .then((r) => r.json())
      .then((data: ScenarioIndexItem[]) => setScenarios(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-pp-border border-t-pp-purple" />
      </div>
    );
  }

  if (!scenarios.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Zap className="h-8 w-8 text-pp-muted/20" />
        <p className="text-xs text-pp-muted">No scenarios yet — run your first simulation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {scenarios.map((s) => {
        const IconComp = typeIcon[s.scenario_type] ?? Zap;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-left transition-all hover:border-pp-purple/30 hover:bg-pp-surface-raised"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pp-surface-raised">
              <IconComp className="h-3.5 w-3.5 text-pp-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-pp-text">{s.scenario_title}</p>
              <p className="text-[10px] text-pp-muted mt-0.5 flex items-center gap-1.5">
                <Clock className="h-2.5 w-2.5" />
                {new Date(s.created_at).toLocaleDateString()} &middot;{" "}
                {s.scenario_type} &middot; {s.simulation_mode.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  confidenceDot[s.confidence_band] ?? "bg-pp-muted/40"
                )}
                title={`Confidence: ${s.confidence_band}`}
              />
              <ChevronRight className="h-3.5 w-3.5 text-pp-muted/40" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
