"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Shield, Zap, ChevronDown } from "lucide-react";
import type { SimulationRequest } from "@/lib/simulation/types";
import { SECURITY_TEMPLATES, CONTENT_TEMPLATES } from "@/lib/simulation/templates";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ScenarioFormProps {
  onResult: (data: import("@/lib/simulation/types").SavedScenario) => void;
  onLoading: (v: boolean) => void;
  loading: boolean;
}

const SCENARIO_TYPES: SimulationRequest["scenario_type"][] = [
  "strategy", "product", "operations", "finance",
  "marketing", "security", "crisis_pr", "policy_regulatory",
];

const SIMULATION_MODES: { value: SimulationRequest["simulation_mode"]; label: string; desc: string }[] = [
  { value: "quick_estimate", label: "Quick Estimate", desc: "Fast, low-depth — good for early exploration" },
  { value: "standard_projection", label: "Standard Projection", desc: "Balanced depth — recommended default" },
  { value: "deep_scenario", label: "Deep Scenario", desc: "Full failure chain + second-order effects" },
  { value: "adversarial_red_team", label: "Adversarial / Red Team", desc: "Assume the worst — find all failure paths" },
];

const TIME_HORIZONS: { value: SimulationRequest["time_horizon"]; label: string }[] = [
  { value: "7_days", label: "7 days" },
  { value: "30_days", label: "30 days" },
  { value: "90_days", label: "90 days" },
  { value: "6_months", label: "6 months" },
  { value: "12_months", label: "12 months" },
  { value: "3_years", label: "3 years" },
];

const RISK_LEVELS: SimulationRequest["risk_sensitivity"][] = ["low", "medium", "high", "extreme"];

const riskColor: Record<SimulationRequest["risk_sensitivity"], string> = {
  low: "text-pp-success border-pp-success/30 bg-pp-success/10",
  medium: "text-pp-warning border-pp-warning/30 bg-pp-warning/10",
  high: "text-pp-error border-pp-error/30 bg-pp-error/10",
  extreme: "text-red-400 border-red-400/30 bg-red-400/10",
};

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-pp-border bg-pp-surface px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/50 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-pp-border bg-pp-surface px-3 py-2 text-xs text-pp-muted hover:border-pp-purple/40 hover:text-pp-purple"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1.5 rounded-md border border-pp-border bg-pp-surface-raised px-2 py-0.5 text-xs text-pp-text"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-pp-muted hover:text-pp-error"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScenarioForm({ onResult, onLoading, loading }: ScenarioFormProps) {
  const [form, setForm] = useState<Partial<SimulationRequest>>({
    scenario_type: "strategy",
    simulation_mode: "standard_projection",
    time_horizon: "90_days",
    risk_sensitivity: "medium",
    stakeholders: [],
    assumptions: [],
    variables_to_inject: [],
  });
  const [showTemplates, setShowTemplates] = useState(false);

  const set = (k: keyof SimulationRequest, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const applyTemplate = (tpl: typeof SECURITY_TEMPLATES[number] | typeof CONTENT_TEMPLATES[number]) => {
    setForm((f) => ({
      ...f,
      scenario_title: tpl.title,
      scenario_type: tpl.scenario_type,
      decision_question: tpl.decision_question,
      context: tpl.description,
      stakeholders: tpl.stakeholders,
      assumptions: tpl.assumptions,
      variables_to_inject: tpl.variables_to_inject,
      template_id: tpl.id,
    }));
    setShowTemplates(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scenario_title || !form.decision_question) return;
    onLoading(true);
    try {
      const body: Partial<SimulationRequest> = {
        ...form,
        scenario_id: generateId(),
        requesting_agent: "dashboard",
        namespace: "penthouse-papi",
      };
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onResult(data);
    } catch (err) {
      console.error(err);
      alert("Simulation failed: " + String(err));
    } finally {
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Template picker */}
      <div>
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-pp-border bg-pp-surface-raised px-3 py-2 text-xs font-medium text-pp-muted transition-colors hover:border-pp-purple/40 hover:text-pp-purple"
        >
          <Shield className="h-3.5 w-3.5" />
          Load Template
          <ChevronDown className={cn("h-3 w-3 transition-transform", showTemplates && "rotate-180")} />
        </button>

        {showTemplates && (
          <div className="mt-2 rounded-xl border border-pp-border bg-pp-surface p-3 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-pp-muted">Security Templates</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {SECURITY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="rounded-lg border border-pp-border bg-pp-surface-raised px-3 py-2 text-left text-xs text-pp-text hover:border-pp-error/40 hover:bg-pp-error/5 transition-colors"
                >
                  <span className="block font-semibold text-pp-error">{t.title}</span>
                  <span className="mt-0.5 block text-pp-muted line-clamp-2">{t.description}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-pp-muted pt-1">Content / Strategy Templates</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CONTENT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="rounded-lg border border-pp-border bg-pp-surface-raised px-3 py-2 text-left text-xs text-pp-text hover:border-pp-purple/40 hover:bg-pp-purple/5 transition-colors"
                >
                  <span className="block font-semibold text-pp-purple">{t.title}</span>
                  <span className="mt-0.5 block text-pp-muted line-clamp-2">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Scenario Title *</label>
        <input
          required
          value={form.scenario_title ?? ""}
          onChange={(e) => set("scenario_title", e.target.value)}
          placeholder="e.g. Launch OpenChief Lite homepage assistant"
          className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text placeholder:text-pp-muted/50 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30"
        />
      </div>

      {/* Type + Mode row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Scenario Type</label>
          <select
            value={form.scenario_type}
            onChange={(e) => set("scenario_type", e.target.value)}
            className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
          >
            {SCENARIO_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " / ").replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Simulation Mode</label>
          <select
            value={form.simulation_mode}
            onChange={(e) => set("simulation_mode", e.target.value as SimulationRequest["simulation_mode"])}
            className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
          >
            {SIMULATION_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-pp-muted">
            {SIMULATION_MODES.find((m) => m.value === form.simulation_mode)?.desc}
          </p>
        </div>
      </div>

      {/* Decision question */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Decision Question *</label>
        <input
          required
          value={form.decision_question ?? ""}
          onChange={(e) => set("decision_question", e.target.value)}
          placeholder="What happens if we...?"
          className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text placeholder:text-pp-muted/50 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30"
        />
      </div>

      {/* Context */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Context / Description</label>
        <textarea
          value={form.context ?? ""}
          onChange={(e) => set("context", e.target.value)}
          rows={3}
          placeholder="Background information, current state, relevant constraints..."
          className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text placeholder:text-pp-muted/50 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30 resize-none"
        />
      </div>

      {/* Tag inputs */}
      <TagInput
        label="Stakeholders / Entities"
        placeholder="e.g. visitors, ChiefPM, sales..."
        values={form.stakeholders ?? []}
        onChange={(v) => set("stakeholders", v)}
      />
      <TagInput
        label="Assumptions"
        placeholder="e.g. Traffic is modest at launch..."
        values={form.assumptions ?? []}
        onChange={(v) => set("assumptions", v)}
      />
      <TagInput
        label="Variables to Inject"
        placeholder="e.g. higher visitor volume, poor onboarding copy..."
        values={form.variables_to_inject ?? []}
        onChange={(v) => set("variables_to_inject", v)}
      />

      {/* Time horizon + Risk sensitivity row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Time Horizon</label>
          <select
            value={form.time_horizon}
            onChange={(e) => set("time_horizon", e.target.value as SimulationRequest["time_horizon"])}
            className="w-full rounded-lg border border-pp-border bg-pp-surface px-3 py-2.5 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
          >
            {TIME_HORIZONS.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">Risk Sensitivity</label>
          <div className="flex gap-1.5">
            {RISK_LEVELS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("risk_sensitivity", r)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all",
                  form.risk_sensitivity === r
                    ? riskColor[r]
                    : "border-pp-border text-pp-muted hover:text-pp-text"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-200",
          loading
            ? "border-pp-border bg-pp-surface text-pp-muted cursor-not-allowed"
            : "border-pp-purple/40 bg-pp-purple/10 text-pp-purple hover:bg-pp-purple/20 hover:border-pp-purple/60 glow-purple"
        )}
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-pp-purple/30 border-t-pp-purple" />
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Simulation
            <Zap className="h-3.5 w-3.5 opacity-60" />
          </>
        )}
      </button>

      {/* MiroFish note */}
      <p className="text-center text-[10px] text-pp-muted/50">
        Powered by OpenChief Local Sim V1 &mdash;{" "}
        <span className="text-pp-gold/60">MiroFish graph engine coming in V2</span>
      </p>
    </form>
  );
}
