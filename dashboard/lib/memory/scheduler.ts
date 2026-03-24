import cron from "node-cron";
import { MemoryEngine } from "./engine";
import { DailyWriter } from "./daily-writer";
import { EventLogger } from "./event-logger";
import { KnowledgeManager } from "./knowledge-manager";
import { TacitManager } from "./tacit-manager";
import { Heartbeat } from "./heartbeat";
import { Consolidator } from "./consolidator";
import { AutoresearchWorker } from "./autoresearch/worker";
import { ResearchQueue } from "./autoresearch/queue";

interface SchedulerState {
  running: boolean;
  jobs: {
    name: string;
    schedule: string;
    lastRun: string | null;
    nextRun: string | null;
    status: "idle" | "running" | "error";
    error?: string;
  }[];
}

let schedulerState: SchedulerState = {
  running: false,
  jobs: [],
};

let tasks: cron.ScheduledTask[] = [];

export function getSchedulerState(): SchedulerState {
  return schedulerState;
}

export async function startScheduler(): Promise<void> {
  if (schedulerState.running) return;

  const engine = await MemoryEngine.create(process.cwd());
  const dw = new DailyWriter(engine);
  const el = new EventLogger(engine);
  const km = new KnowledgeManager(engine);
  const tm = new TacitManager(engine);
  const rq = new ResearchQueue(engine);

  const heartbeat = new Heartbeat(engine, el, rq);
  const consolidator = new Consolidator(engine, dw, el, km, tm);
  const worker = new AutoresearchWorker(engine, {
    perplexityApiKey: process.env.PERPLEXITY_API_KEY,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
  });

  schedulerState.jobs = [
    { name: "heartbeat", schedule: "*/15 * * * *", lastRun: null, nextRun: null, status: "idle" },
    { name: "autoresearch", schedule: "0 */4 * * *", lastRun: null, nextRun: null, status: "idle" },
    { name: "consolidation", schedule: "0 2 * * *", lastRun: null, nextRun: null, status: "idle" },
  ];

  // Heartbeat — every 15 minutes
  const heartbeatTask = cron.schedule("*/15 * * * *", async () => {
    const job = schedulerState.jobs.find(j => j.name === "heartbeat")!;
    job.status = "running";
    try {
      await heartbeat.run();
      job.lastRun = new Date().toISOString();
      job.status = "idle";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    }
  });

  // Autoresearch — every 4 hours, process up to 3 items
  const autoresearchTask = cron.schedule("0 */4 * * *", async () => {
    const job = schedulerState.jobs.find(j => j.name === "autoresearch")!;
    job.status = "running";
    try {
      for (let i = 0; i < 3; i++) {
        const result = await worker.processNext();
        if (!result) break; // queue empty
      }
      job.lastRun = new Date().toISOString();
      job.status = "idle";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    }
  });

  // Consolidation — 2 AM daily
  const consolidationTask = cron.schedule("0 2 * * *", async () => {
    const job = schedulerState.jobs.find(j => j.name === "consolidation")!;
    job.status = "running";
    try {
      await consolidator.run();
      job.lastRun = new Date().toISOString();
      job.status = "idle";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    }
  });

  tasks = [heartbeatTask, autoresearchTask, consolidationTask];
  schedulerState.running = true;

  console.log("[Scheduler] Started: heartbeat (15m), autoresearch (4h), consolidation (2am)");
}

export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks = [];
  schedulerState.running = false;
  console.log("[Scheduler] Stopped");
}

// Run a specific job immediately (for manual triggers)
export async function runJobNow(jobName: string): Promise<void> {
  const engine = await MemoryEngine.create(process.cwd());
  const dw = new DailyWriter(engine);
  const el = new EventLogger(engine);
  const km = new KnowledgeManager(engine);
  const tm = new TacitManager(engine);
  const rq = new ResearchQueue(engine);

  const job = schedulerState.jobs.find(j => j.name === jobName);
  if (job) {
    job.status = "running";
  }

  try {
    switch (jobName) {
      case "heartbeat":
        await new Heartbeat(engine, el, rq).run();
        break;
      case "autoresearch":
        const worker = new AutoresearchWorker(engine, {
          perplexityApiKey: process.env.PERPLEXITY_API_KEY,
          youtubeApiKey: process.env.YOUTUBE_API_KEY,
        });
        await worker.processNext();
        break;
      case "consolidation":
        await new Consolidator(engine, dw, el, km, tm).run();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
    if (job) {
      job.lastRun = new Date().toISOString();
      job.status = "idle";
    }
  } catch (err) {
    if (job) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    }
    throw err;
  }
}
