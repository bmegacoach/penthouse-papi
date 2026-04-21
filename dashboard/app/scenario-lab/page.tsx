"use client";

import { useState } from "react";
import { FlaskConical, History } from "lucide-react";
import { ScenarioForm } from "@/components/scenario-lab/scenario-form";
import { ResultPanel } from "@/components/scenario-lab/result-panel";
import { SavedScenarios } from "@/components/scenario-lab/saved-scenarios";
import type { SavedScenario } from "@/lib/simulation/types";

export default function ScenarioLabPage() {
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<SavedScenario | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [view, setView] = useState<"form" | "history">("form");

  const handleResult = (data: SavedScenario) => {
    setActiveScenario(data);
    setRefreshTick((n) => n + 1);
  };

  const handleSelectSaved = async (id: string) => {
    try {
      const res = await fetch(`/api/simulation?id=${id}`);
      if (!res.ok) return;
      const data: SavedScenario = await res.json();
      setActiveScenario(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="fade-up fade-up-1 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-pp-text">Scenario Lab</h1>
            <span className="rounded-full border border-pp-gold/30 bg-pp-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-pp-gold">
              MiroFish V2 ready
            </span>
          </div>
          <p className="mt-1 text-sm text-pp-muted">
            Run structured scenario projections for strategy, operations, content, and security decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("form")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
              view === "form"
                ? "border-pp-purple/40 bg-pp-purple/10 text-pp-purple"
                : "border-pp-border text-pp-muted hover:text-pp-text"
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            New Scenario
          </button>
          <button
            onClick={() => setView("history")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
              view === "history"
                ? "border-pp-purple/40 bg-pp-purple/10 text-pp-purple"
                : "border-pp-border text-pp-muted hover:text-pp-text"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Saved Scenarios
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 fade-up fade-up-2">
        {/* Left panel — Form or History */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
            {view === "form" ? (
              <>
                <div className="mb-5 flex items-center gap-2.5">
                  <FlaskConical className="h-4 w-4 text-pp-purple" />
                  <h2 className="text-sm font-semibold text-pp-text">Scenario Intake</h2>
                </div>
                <ScenarioForm
                  onResult={handleResult}
                  onLoading={setLoading}
                  loading={loading}
                />
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2.5">
                  <History className="h-4 w-4 text-pp-purple" />
                  <h2 className="text-sm font-semibold text-pp-text">Saved Scenarios</h2>
                </div>
                <SavedScenarios onSelect={handleSelectSaved} refreshTrigger={refreshTick} />
              </>
            )}
          </div>
        </div>

        {/* Right panel — Results */}
        <div className="lg:col-span-3">
          {activeScenario ? (
            <div className="space-y-0">
              <ResultPanel scenario={activeScenario} />
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-pp-border bg-pp-surface text-center grid-pattern p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pp-purple/10">
                <FlaskConical className="h-7 w-7 text-pp-purple/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-pp-text">No scenario results yet</p>
                <p className="mt-1 text-xs text-pp-muted max-w-xs">
                  Fill out the intake form and run a simulation, or load a saved scenario from History.
                </p>
              </div>
              <div className="rounded-lg border border-pp-gold/20 bg-pp-gold/5 px-4 py-2.5 max-w-sm">
                <p className="text-xs text-pp-gold/70">
                  V1 uses the OpenChief local simulation engine.{" "}
                  <strong className="text-pp-gold">MiroFish graph engine</strong> integration is coming in V2
                  — the request/response contract is already stable.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved scenarios strip — always visible at bottom when form is active */}
      {view === "form" && (
        <div className="fade-up fade-up-3 rounded-xl border border-pp-border bg-pp-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-pp-muted" />
              <span className="text-xs font-semibold text-pp-muted uppercase tracking-wider">Recent Scenarios</span>
            </div>
            <button
              onClick={() => setView("history")}
              className="text-[10px] text-pp-purple hover:underline"
            >
              View all
            </button>
          </div>
          <SavedScenarios onSelect={handleSelectSaved} refreshTrigger={refreshTick} />
        </div>
      )}
    </div>
  );
}
