// ── Simulation Persistence ───────────────────────────────────────────────────
// Saves scenario runs to memory/state/simulations/<id>.json
// and registers them in memory/state/simulations/index.json

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SavedScenario, SimulationRequest, SimulationResult } from "./types";

const STORE_DIR = join(process.cwd(), "memory", "state", "simulations");
const INDEX_PATH = join(STORE_DIR, "index.json");

async function ensureDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
}

export async function saveScenario(
  req: SimulationRequest,
  result: SimulationResult
): Promise<SavedScenario> {
  await ensureDir();

  const record: SavedScenario = {
    id: req.scenario_id,
    created_at: new Date().toISOString(),
    namespace: req.namespace ?? "penthouse-papi",
    requesting_agent: req.requesting_agent ?? "dashboard",
    run_type: result.engine === "mirofish_v2" ? "mirofish" : "local",
    request: req,
    result,
  };

  // Write individual record
  const recordPath = join(STORE_DIR, `${req.scenario_id}.json`);
  await writeFile(recordPath, JSON.stringify(record, null, 2), "utf-8");

  // Update index
  const index = await loadIndex();
  const existing = index.findIndex((s) => s.id === req.scenario_id);
  const summary = {
    id: record.id,
    created_at: record.created_at,
    namespace: record.namespace,
    scenario_title: req.scenario_title,
    scenario_type: req.scenario_type,
    simulation_mode: req.simulation_mode,
    confidence_band: result.confidence_band,
    run_type: record.run_type,
  };
  if (existing >= 0) {
    index[existing] = summary as typeof index[number];
  } else {
    index.unshift(summary as typeof index[number]);
  }
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");

  return record;
}

export async function loadIndex(): Promise<
  {
    id: string;
    created_at: string;
    namespace: string;
    scenario_title: string;
    scenario_type: string;
    simulation_mode: string;
    confidence_band: string;
    run_type: string;
  }[]
> {
  try {
    const raw = await readFile(INDEX_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function loadScenario(id: string): Promise<SavedScenario | null> {
  try {
    const raw = await readFile(join(STORE_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as SavedScenario;
  } catch {
    return null;
  }
}
