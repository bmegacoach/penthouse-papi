"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  GitBranch, Eye, Lightbulb, Shield, Target, Activity,
  ChevronDown, ChevronUp, Info, PlusCircle,
} from "lucide-react";
import type { SavedScenario, ConfidenceBand } from "@/lib/simulation/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ResultPanelProps {
  scenario: SavedScenario;
}

const confidenceColor: Record<ConfidenceBand, string> = {
  very_low: "text-red-400 border-red-400/30 bg-red-400/10",
  low: "text-pp-error border-pp-error/30 bg-pp-error/10",
  medium: "text-pp-warning border-pp-warning/30 bg-pp-warning/10",
  high: "text-pp-success border-pp-success/30 bg-pp-success/10",
  very_high: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
};

function Section({
  icon: Icon,
  title,
  color = "text-pp-muted",
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  color?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-xs font-semibold uppercase tracking-wider text-pp-muted">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-pp-muted/40" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-pp-muted/40" />
        )}
      </button>
      {open && (
        <div className="border-t border-pp-border px-4 pb-4 pt-3">{children}</div>
      )}
    </div>
  );
}

function BulletList({ items, accent }: { items: string[]; accent?: string }) {
  if (!items.length) return <p className="text-xs text-pp-muted/50 italic">None specified</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-pp-text">
          <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", accent ?? "bg-pp-muted/40")} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ResultPanel({ scenario }: ResultPanelProps) {
  const router = useRouter();
  const { result, request } = scenario;
  const [conceptCreated, setConceptCreated] = useState(false);
  if (!result) return null;

  const isSimulated = result.engine === "openchief_local_sim_v1";
  const isHighConfidence = result.confidence_band === "high" || result.confidence_band === "very_high";

  const createConceptFromScenario = async () => {
    const res = await fetch("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[Scenario] ${request.scenario_title}`,
        description: `${result.recommendation}\n\nBased on scenario projection (${result.confidence_band} confidence): ${result.most_likely_outcome}`,
        brand: "GBB",
        tags: ["scenario_driven", request.scenario_type],
        status: "draft",
        scenarioId: result.scenario_id,
      }),
    });
    if (res.ok) {
      setConceptCreated(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pp-border bg-pp-surface-raised px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-pp-text">{request.scenario_title}</h3>
          <p className="text-xs text-pp-muted mt-0.5">
            {request.scenario_type} &middot; {request.simulation_mode.replace(/_/g, " ")} &middot;{" "}
            {new Date(result.run_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
              confidenceColor[result.confidence_band]
            )}
          >
            {result.confidence_band.replace("_", " ")} confidence
          </span>
          {isSimulated && (
            <span className="flex items-center gap-1 rounded-full border border-pp-border px-2.5 py-0.5 text-[10px] text-pp-muted">
              <Info className="h-2.5 w-2.5" />
              SIMULATED
            </span>
          )}
        </div>
      </div>

      {/* Simulation disclaimer */}
      {isSimulated && (
        <div className="flex items-start gap-2 rounded-lg border border-pp-warning/20 bg-pp-warning/5 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-pp-warning mt-0.5" />
          <p className="text-xs text-pp-warning/80">
            <strong>Simulated projection</strong> — results are structured estimates, not verified data.
            Assumptions and projections are labeled. Upgrade to MiroFish V2 for higher-fidelity graph simulation.
          </p>
        </div>
      )}

      {/* Executive summary */}
      <Section icon={Activity} title="Executive Summary" color="text-pp-purple">
        <p className="text-sm leading-relaxed text-pp-text">{result.executive_summary}</p>
      </Section>

      {/* Outcomes grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-pp-success/20 bg-pp-success/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-pp-success" />
            <span className="text-xs font-semibold uppercase tracking-wider text-pp-success">Best Case</span>
          </div>
          <p className="text-xs leading-relaxed text-pp-text">{result.best_case}</p>
        </div>
        <div className="rounded-xl border border-pp-warning/20 bg-pp-warning/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-pp-warning" />
            <span className="text-xs font-semibold uppercase tracking-wider text-pp-warning">Most Likely</span>
          </div>
          <p className="text-xs leading-relaxed text-pp-text">{result.most_likely_outcome}</p>
        </div>
        <div className="rounded-xl border border-pp-error/20 bg-pp-error/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-pp-error" />
            <span className="text-xs font-semibold uppercase tracking-wider text-pp-error">Worst Case</span>
          </div>
          <p className="text-xs leading-relaxed text-pp-text">{result.worst_case}</p>
        </div>
      </div>

      {/* Recommendation */}
      <Section icon={CheckCircle2} title="Recommendation" color="text-pp-purple" defaultOpen>
        <p className="text-sm leading-relaxed text-pp-text">{result.recommendation}</p>
      </Section>

      {/* Key assumptions */}
      <Section icon={Info} title="Key Assumptions" color="text-pp-warning" defaultOpen>
        <div className="space-y-1.5">
          {result.key_assumptions.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pp-warning/60" />
              <span className="text-pp-text">
                {a}
                <span className="ml-1.5 text-[10px] text-pp-warning/60">[assumption]</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Key risks */}
      <Section icon={AlertTriangle} title="Key Risks / Pressure Points" color="text-pp-error" defaultOpen={false}>
        <BulletList items={result.key_risks} accent="bg-pp-error/60" />
      </Section>

      {/* Failure chain */}
      <Section icon={GitBranch} title="Failure Chain / Risk Path" color="text-pp-error" defaultOpen={false}>
        <ol className="space-y-2">
          {result.failure_chain.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-pp-text">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-pp-error/30 bg-pp-error/10 text-[10px] font-bold text-pp-error">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>

      {/* Leading indicators */}
      <Section icon={Eye} title="Leading Indicators to Monitor" color="text-pp-success" defaultOpen={false}>
        <BulletList items={result.leading_indicators} accent="bg-pp-success/60" />
      </Section>

      {/* Next actions */}
      <Section icon={Lightbulb} title="Follow-up Actions" color="text-pp-purple" defaultOpen>
        <ol className="space-y-2">
          {result.next_actions.map((action, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-pp-text">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-pp-purple/30 bg-pp-purple/10 text-[10px] font-bold text-pp-purple">
                {i + 1}
              </span>
              {action}
            </li>
          ))}
        </ol>
      </Section>

      {/* Create Concept — show for high confidence scenarios */}
      {isHighConfidence && (
        <div className="rounded-xl border border-pp-purple/30 bg-pp-purple/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-pp-purple" />
              <div>
                <p className="text-xs font-semibold text-pp-text">High-confidence projection</p>
                <p className="text-[10px] text-pp-muted">Create a content concept from this scenario's recommendation</p>
              </div>
            </div>
            {conceptCreated ? (
              <span className="flex items-center gap-1 text-xs text-pp-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concept created
              </span>
            ) : (
              <button
                onClick={createConceptFromScenario}
                className="flex items-center gap-2 rounded-lg bg-pp-purple px-4 py-2 text-xs font-medium text-white hover:bg-pp-purple/80 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Create Concept
              </button>
            )}
          </div>
        </div>
      )}

      {/* Security section — only if present */}
      {result.security && (
        <Section icon={Shield} title="Security Analysis" color="text-pp-error" defaultOpen>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-pp-error">Attack Path</p>
              <ol className="space-y-1.5">
                {result.security.attack_path.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-pp-text">
                    <span className="mt-0.5 text-pp-error font-bold">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-pp-error">Blast Radius</p>
              <p className="text-xs text-pp-text">{result.security.blast_radius}</p>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-pp-warning">Control Breakpoints</p>
              <BulletList items={result.security.control_breakpoints} accent="bg-pp-warning/60" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-pp-success">Suggested Mitigations</p>
              <BulletList items={result.security.suggested_mitigations} accent="bg-pp-success/60" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-pp-muted">Monitoring Signals</p>
              <BulletList items={result.security.monitoring_signals} accent="bg-pp-muted/40" />
            </div>
          </div>
        </Section>
      )}

      {/* Footer */}
      <div className="rounded-lg border border-pp-border/50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-pp-muted/50">
          Engine: {result.engine} &middot; ID: {result.scenario_id.slice(0, 8)}...
        </span>
        <span className="text-[10px] text-pp-gold/50">MiroFish V2 backend — coming soon</span>
      </div>
    </div>
  );
}
