// ── OpenChief Local Simulation Engine V1 ────────────────────────────────────
// Backend-agnostic contract — swap engine field to "mirofish_v2" when ready.
// V1 uses structured multi-pass prompt templates to generate scenario briefs.
// MiroFish V2 integration path: replace runLocal() with runMiroFish() behind
// the same SimulationRequest → SimulationResult interface.

import type {
  SimulationRequest,
  SimulationResult,
  ConfidenceBand,
  SecurityOutput,
} from "./types";

// ── Confidence mapping ────────────────────────────────────────────────────────

function modeToConfidence(
  mode: SimulationRequest["simulation_mode"],
  risk: SimulationRequest["risk_sensitivity"]
): ConfidenceBand {
  const modeScore: Record<SimulationRequest["simulation_mode"], number> = {
    quick_estimate: 1,
    standard_projection: 2,
    deep_scenario: 3,
    adversarial_red_team: 3,
  };
  const riskPenalty: Record<SimulationRequest["risk_sensitivity"], number> = {
    low: 0,
    medium: 0,
    high: -1,
    extreme: -2,
  };
  const score = modeScore[mode] + riskPenalty[risk];
  if (score <= 0) return "very_low";
  if (score === 1) return "low";
  if (score === 2) return "medium";
  if (score === 3) return "high";
  return "very_high";
}

// ── Time horizon humanizer ────────────────────────────────────────────────────

function humanizeHorizon(h: SimulationRequest["time_horizon"]): string {
  return {
    "7_days": "7 days",
    "30_days": "30 days",
    "90_days": "90 days",
    "6_months": "6 months",
    "12_months": "12 months",
    "3_years": "3 years",
  }[h];
}

// ── Security output generator ─────────────────────────────────────────────────

function buildSecurityOutput(req: SimulationRequest): SecurityOutput {
  const vars = req.variables_to_inject.join("; ");
  return {
    attack_path: [
      `Initial trigger: ${vars || "unknown vector"}`,
      "Lateral spread through shared memory or fleet messaging",
      "Escalation to external services (Discord, broker API, Supabase)",
      "Data exfiltration or unauthorized action completed",
    ],
    blast_radius: `Affects ${req.stakeholders.join(", ")}. Primary impact within ${humanizeHorizon(req.time_horizon)}.`,
    control_breakpoints: [
      "Human-in-the-loop review gate before publishing",
      "Tool permission scoping per agent lane",
      "Webhook HMAC signing and IP allowlisting",
      "Read-only memory paths for untrusted agent inputs",
    ],
    suggested_mitigations: [
      "Rotate affected credentials immediately",
      "Enable per-agent tool permission scoping in chiefos/agents.toml",
      "Add adversarial input detection before agent context injection",
      "Require claim confirmation for high-risk tool calls",
    ],
    monitoring_signals: [
      "Unusual tool call frequency from a single agent",
      "Memory write events from non-owning namespaces",
      "Discord/Telegram messages not matching expected agent patterns",
      "API rate-limit hits on broker or LLM endpoints",
    ],
  };
}

// ── Core local engine ─────────────────────────────────────────────────────────

export async function runLocalSimulation(req: SimulationRequest): Promise<SimulationResult> {
  const horizon = humanizeHorizon(req.time_horizon);
  const confidence = modeToConfidence(req.simulation_mode, req.risk_sensitivity);
  const isAdversarial = req.simulation_mode === "adversarial_red_team";
  const isDeep = req.simulation_mode === "deep_scenario" || isAdversarial;
  const isSecurity = req.scenario_type === "security";

  // Build context-aware projections
  const assumptionsList = req.assumptions.length
    ? req.assumptions
    : ["No explicit assumptions provided — projections are higher uncertainty"];

  const variablesList = req.variables_to_inject.length
    ? req.variables_to_inject
    : ["No injection variables specified"];

  const stakeholderStr = req.stakeholders.length
    ? req.stakeholders.join(", ")
    : "unspecified stakeholders";

  const summary = `[SIMULATED — ${req.simulation_mode.toUpperCase()}] ` +
    `This ${req.scenario_type} scenario explores: "${req.decision_question}". ` +
    `Over a ${horizon} horizon, with ${req.risk_sensitivity} risk sensitivity, ` +
    `the primary considerations involve ${stakeholderStr}. ` +
    (isSecurity
      ? `Security analysis indicates multiple control breakpoints should be evaluated before proceeding.`
      : `Decision quality depends heavily on validating the stated assumptions against real data.`);

  const mostLikely = isSecurity
    ? `The most likely path is a partial exploit that triggers manual remediation. Full containment takes 2–8 hours depending on rotation automation.`
    : `Given current assumptions, the most likely outcome within ${horizon} is moderate progress with 2–3 blocking variables needing resolution. Key dependencies: ${variablesList.slice(0, 2).join(", ")}.`;

  const bestCase = isSecurity
    ? `Attack is detected within minutes via monitoring signals. Automated key rotation and agent lane enforcement contain the blast radius to a single service.`
    : `All injection variables resolve favorably. ${stakeholderStr} align quickly, and the decision generates compounding positive returns within ${horizon}.`;

  const worstCase = isSecurity
    ? `Attack goes undetected for >24 hours. Multiple services compromised. Public exposure triggers reputational damage. Full recovery takes weeks.`
    : isAdversarial
    ? `All failure chains activate simultaneously. ${stakeholderStr} defect, key assumptions prove false, and the decision becomes a liability that requires reversal at significant cost.`
    : `Two or more injection variables combine negatively. The decision fails to gain traction and requires reversal within half the ${horizon} window.`;

  const keyRisks = [
    `Assumption drift — stated assumptions may not hold at the ${horizon} mark`,
    `Stakeholder misalignment among: ${stakeholderStr}`,
    ...variablesList.slice(0, 2).map((v) => `Variable impact: "${v}"`),
    isDeep ? `Second-order effects not captured in this simulation — requires MiroFish graph modeling for full fidelity` : null,
  ].filter(Boolean) as string[];

  const failureChain = [
    `Step 1: Key assumption fails — "${assumptionsList[0]}"`,
    `Step 2: Variable injects unexpected pressure — "${variablesList[0]}"`,
    `Step 3: Stakeholders react defensively or exit`,
    `Step 4: Decision becomes entrenched without clear exit`,
    `Step 5: Reversal costs exceed original opportunity value`,
  ];

  const leadingIndicators = [
    `Watch for early signal from: ${stakeholderStr.split(",")[0]?.trim() ?? "primary stakeholder"}`,
    `Variable "${variablesList[0]}" should show movement within ${horizon.includes("day") ? "week 1" : "month 1"}`,
    `Assumption "${assumptionsList[0]}" should be validated before committing resources`,
    isSecurity ? "Monitor error rates, auth anomalies, and fleet dispatch logs daily" : null,
  ].filter(Boolean) as string[];

  const recommendation = isSecurity
    ? `Treat this as a real threat. Run a live tabletop exercise with all relevant agents and operators within 30 days. Implement the control breakpoints before the next major deployment.`
    : confidence === "very_low" || confidence === "low"
    ? `Decision should be deferred until assumptions can be validated. Too many variables are unresolved for a confident recommendation.`
    : `Proceed with structured monitoring. Validate assumptions "${assumptionsList[0]}" within the first 20% of the ${horizon} window and adjust course if leading indicators diverge.`;

  const nextActions = [
    `Validate: ${assumptionsList[0]}`,
    `Monitor variable: ${variablesList[0]}`,
    isSecurity ? "Schedule tabletop exercise with agent fleet and ops" : `Schedule decision review at 25% of ${horizon} window`,
    isDeep ? "Upgrade to MiroFish graph simulation for deeper second-order analysis" : "Re-run as Deep Scenario if confidence is insufficient",
    `Save this scenario to memory/knowledge/scenarios/${req.scenario_id}.md`,
  ];

  const result: SimulationResult = {
    scenario_id: req.scenario_id,
    status: "completed",
    engine: "openchief_local_sim_v1",
    run_at: new Date().toISOString(),
    executive_summary: summary,
    most_likely_outcome: mostLikely,
    best_case: bestCase,
    worst_case: worstCase,
    key_assumptions: assumptionsList,
    key_risks: keyRisks,
    failure_chain: failureChain,
    leading_indicators: leadingIndicators,
    recommendation,
    confidence_band: confidence,
    next_actions: nextActions,
    sources: [
      ...assumptionsList.map((a) => ({ label: a, is_assumption: true })),
      { label: `Decision question: ${req.decision_question}`, is_assumption: false },
    ],
    ...(isSecurity ? { security: buildSecurityOutput(req) } : {}),
  };

  return result;
}

// ── MiroFish V2 stub ──────────────────────────────────────────────────────────
// Replace this stub with actual MiroFish API calls when the backend is ready.
// The request/response contract above is already shaped to match MiroFish's
// graph-building → simulation → report workflow.

export async function runMiroFishSimulation(
  _req: SimulationRequest
): Promise<SimulationResult> {
  throw new Error(
    "MiroFish backend not yet integrated. Coming in V2. " +
    "See docs/plans/scenario-lab-mirofish-integration.md for the roadmap."
  );
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

export async function runSimulation(req: SimulationRequest): Promise<SimulationResult> {
  // V2: check config flag or feature flag to route to MiroFish
  return runLocalSimulation(req);
}
