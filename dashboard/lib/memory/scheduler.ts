import cron, { type ScheduledTask } from "node-cron";

type JobStatus = "idle" | "running" | "error";

interface SchedulerState {
  running: boolean;
  jobs: {
    heartbeat: { status: JobStatus; lastRun: string | null; nextRun: string | null; error: string | null };
    autoresearch: { status: JobStatus; lastRun: string | null; nextRun: string | null; error: string | null };
    consolidation: { status: JobStatus; lastRun: string | null; nextRun: string | null; error: string | null };
  };
}

const state: SchedulerState = {
  running: false,
  jobs: {
    heartbeat: { status: "idle", lastRun: null, nextRun: null, error: null },
    autoresearch: { status: "idle", lastRun: null, nextRun: null, error: null },
    consolidation: { status: "idle", lastRun: null, nextRun: null, error: null },
  },
};

let heartbeatTask: ScheduledTask | null = null;
let autoresearchTask: ScheduledTask | null = null;
let consolidationTask: ScheduledTask | null = null;
let hypereditTask: ScheduledTask | null = null;

async function runHyperedit(): Promise<void> {
  try {
    const { processAllJobs } = await import("@/lib/hyperedit/worker");
    await processAllJobs();
  } catch (err) {
    console.error("[Scheduler] Hyperedit error:", err instanceof Error ? err.message : err);
  }
}

async function runHeartbeat(): Promise<void> {
  if (state.jobs.heartbeat.status === "running") return;
  state.jobs.heartbeat.status = "running";
  try {
    // Dynamic import to avoid circular deps and ensure server.ts is ready
    const { getHeartbeat } = await import("./server");
    const hb = await getHeartbeat();
    await hb.run();
    state.jobs.heartbeat.lastRun = new Date().toISOString();
    state.jobs.heartbeat.error = null;
    state.jobs.heartbeat.status = "idle";
  } catch (err) {
    state.jobs.heartbeat.error = err instanceof Error ? err.message : String(err);
    state.jobs.heartbeat.status = "error";
  }
}

async function runAutoresearch(): Promise<void> {
  if (state.jobs.autoresearch.status === "running") return;
  state.jobs.autoresearch.status = "running";
  try {
    const { getWorker } = await import("./server");
    const worker = await getWorker();
    // Process up to 5 items per cycle
    for (let i = 0; i < 5; i++) {
      const item = await worker.processNext();
      if (!item) break;
    }
    state.jobs.autoresearch.lastRun = new Date().toISOString();
    state.jobs.autoresearch.error = null;
    state.jobs.autoresearch.status = "idle";
  } catch (err) {
    state.jobs.autoresearch.error = err instanceof Error ? err.message : String(err);
    state.jobs.autoresearch.status = "error";
  }
}

async function runConsolidation(): Promise<void> {
  if (state.jobs.consolidation.status === "running") return;
  state.jobs.consolidation.status = "running";
  try {
    const { getConsolidator } = await import("./server");
    const consolidator = await getConsolidator();
    await consolidator.run();
    state.jobs.consolidation.lastRun = new Date().toISOString();
    state.jobs.consolidation.error = null;
    state.jobs.consolidation.status = "idle";
  } catch (err) {
    state.jobs.consolidation.error = err instanceof Error ? err.message : String(err);
    state.jobs.consolidation.status = "error";
  }
}

export function startScheduler(): void {
  if (state.running) return;

  // Heartbeat: every 15 minutes
  heartbeatTask = cron.schedule("*/15 * * * *", () => { runHeartbeat(); });

  // Autoresearch: every 4 hours
  autoresearchTask = cron.schedule("0 */4 * * *", () => { runAutoresearch(); });

  // Consolidation: 2 AM daily
  consolidationTask = cron.schedule("0 2 * * *", () => { runConsolidation(); });

  // Hyperedit: every 2 minutes (process queued video jobs)
  hypereditTask = cron.schedule("*/2 * * * *", () => { runHyperedit(); });

  state.running = true;
  console.log("[Scheduler] Started — heartbeat(15m), autoresearch(4h), consolidation(2AM), hyperedit(2m)");

  // Run heartbeat + hyperedit immediately on start
  runHeartbeat();
  runHyperedit();
}

export function stopScheduler(): void {
  heartbeatTask?.stop();
  autoresearchTask?.stop();
  consolidationTask?.stop();
  hypereditTask?.stop();
  state.running = false;
  console.log("[Scheduler] Stopped");
}

export function getSchedulerState(): SchedulerState {
  return { ...state };
}

// Manual trigger for testing
export async function triggerJob(job: "heartbeat" | "autoresearch" | "consolidation" | "hyperedit"): Promise<void> {
  switch (job) {
    case "heartbeat": return runHeartbeat();
    case "autoresearch": return runAutoresearch();
    case "consolidation": return runConsolidation();
    case "hyperedit": return runHyperedit();
  }
}
