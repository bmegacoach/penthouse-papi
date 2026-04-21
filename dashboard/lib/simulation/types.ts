// ── Simulation Contract — backend-agnostic, MiroFish-ready ──────────────────
// V1: local/mock engine  |  V2: swap engine field to "mirofish" with no UI changes

export type ScenarioType =
  | "strategy"
  | "product"
  | "operations"
  | "finance"
  | "marketing"
  | "security"
  | "crisis_pr"
  | "policy_regulatory";

export type SimulationMode =
  | "quick_estimate"
  | "standard_projection"
  | "deep_scenario"
  | "adversarial_red_team";

export type RiskSensitivity = "low" | "medium" | "high" | "extreme";

export type TimeHorizon =
  | "7_days"
  | "30_days"
  | "90_days"
  | "6_months"
  | "12_months"
  | "3_years";

export type ConfidenceBand = "very_low" | "low" | "medium" | "high" | "very_high";

export type SimulationEngine = "openchief_local_sim_v1" | "mirofish_v2";

// ── Request ──────────────────────────────────────────────────────────────────

export interface SimulationRequest {
  scenario_id: string;
  scenario_title: string;
  scenario_type: ScenarioType;
  decision_question: string;
  context: string;
  stakeholders: string[];
  assumptions: string[];
  variables_to_inject: string[];
  time_horizon: TimeHorizon;
  risk_sensitivity: RiskSensitivity;
  simulation_mode: SimulationMode;
  namespace?: string;
  requesting_agent?: string;
  template_id?: string;
}

// ── Response ─────────────────────────────────────────────────────────────────

export interface SimulationSource {
  label: string;
  is_assumption: boolean;
}

export interface SecurityOutput {
  attack_path: string[];
  blast_radius: string;
  control_breakpoints: string[];
  suggested_mitigations: string[];
  monitoring_signals: string[];
}

export interface SimulationResult {
  scenario_id: string;
  status: "completed" | "failed" | "running";
  engine: SimulationEngine;
  run_at: string;
  executive_summary: string;
  most_likely_outcome: string;
  best_case: string;
  worst_case: string;
  key_assumptions: string[];
  key_risks: string[];
  failure_chain: string[];
  leading_indicators: string[];
  recommendation: string;
  confidence_band: ConfidenceBand;
  next_actions: string[];
  sources: SimulationSource[];
  // Security mode only
  security?: SecurityOutput;
  // MiroFish V2 — populated when engine = "mirofish_v2"
  mirofish_graph_id?: string;
  mirofish_report_url?: string;
}

// ── Persisted record ─────────────────────────────────────────────────────────

export interface SavedScenario {
  id: string;
  created_at: string;
  namespace: string;
  requesting_agent: string;
  run_type: "mock" | "local" | "mirofish";
  request: SimulationRequest;
  result: SimulationResult | null;
}

// ── Security templates ───────────────────────────────────────────────────────

export interface SecurityTemplate {
  id: string;
  title: string;
  description: string;
  scenario_type: "security";
  stakeholders: string[];
  assumptions: string[];
  variables_to_inject: string[];
  decision_question: string;
}
