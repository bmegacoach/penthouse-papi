// ── Simulation API Route ─────────────────────────────────────────────────────
// POST /api/simulation  — run a scenario and save result
// GET  /api/simulation  — list saved scenarios
// GET  /api/simulation?id=<uuid> — load a single saved scenario

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runSimulation } from "@/lib/simulation/engine";
import { saveScenario, loadIndex, loadScenario } from "@/lib/simulation/store";
import type { SimulationRequest } from "@/lib/simulation/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SimulationRequest>;

    if (!body.scenario_title || !body.scenario_type || !body.decision_question) {
      return NextResponse.json(
        { error: "scenario_title, scenario_type, and decision_question are required" },
        { status: 400 }
      );
    }

    const request: SimulationRequest = {
      scenario_id: body.scenario_id ?? randomUUID(),
      scenario_title: body.scenario_title,
      scenario_type: body.scenario_type,
      decision_question: body.decision_question,
      context: body.context ?? "",
      stakeholders: body.stakeholders ?? [],
      assumptions: body.assumptions ?? [],
      variables_to_inject: body.variables_to_inject ?? [],
      time_horizon: body.time_horizon ?? "90_days",
      risk_sensitivity: body.risk_sensitivity ?? "medium",
      simulation_mode: body.simulation_mode ?? "standard_projection",
      namespace: body.namespace ?? "penthouse-papi",
      requesting_agent: body.requesting_agent ?? "dashboard",
      template_id: body.template_id,
    };

    const result = await runSimulation(request);
    const saved = await saveScenario(request, result);

    return NextResponse.json(saved, { status: 200 });
  } catch (err) {
    console.error("[simulation/route] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Simulation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const scenario = await loadScenario(id);
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    return NextResponse.json(scenario);
  }

  const index = await loadIndex();
  return NextResponse.json(index);
}
