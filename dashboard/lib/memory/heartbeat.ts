import type { MemoryEngine } from "./engine";
import type { EventLogger } from "./event-logger";
import type { ResearchQueue } from "./autoresearch/queue";
import type { HeartbeatState, MemoryEvent } from "./types";

export class Heartbeat {
  constructor(
    private engine: MemoryEngine,
    private events: EventLogger,
    private researchQueue: ResearchQueue,
  ) {}

  async run(): Promise<HeartbeatState> {
    const todayEvents = await this.events.readToday();

    const state: HeartbeatState = {
      last_run: new Date().toISOString(),
      stalled_tasks: [],
      repeated_blockers: [],
      research_queue_health: { queued: 0, active: 0, failed: 0, dead: 0 },
    };

    // 1. Detect stalled tasks (task_start with no task_complete/task_fail within 2 hours)
    const taskStarts = todayEvents.filter(e => e.type === "task_start");
    const completions = new Set(
      todayEvents
        .filter(e => e.type === "task_complete" || e.type === "task_fail")
        .map(e => JSON.stringify(e.payload))
    );

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const now = Date.now();

    for (const event of taskStarts) {
      const payloadKey = JSON.stringify(event.payload);
      if (!completions.has(payloadKey)) {
        const elapsed = now - new Date(event.timestamp).getTime();
        if (elapsed > twoHoursMs) {
          state.stalled_tasks.push({
            event_id: event.timestamp,
            description: (event.payload as any).description || (event.payload as any).task || "Unknown task",
            stalled_since: event.timestamp,
          });
        }
      }
    }

    // 2. Count repeated blockers (same payload 3+ times)
    const blockerCounts = new Map<string, { count: number; events: MemoryEvent[] }>();
    for (const event of todayEvents.filter(e => e.type === "blocker")) {
      const key = JSON.stringify(event.payload);
      const existing = blockerCounts.get(key) || { count: 0, events: [] };
      existing.count++;
      existing.events.push(event);
      blockerCounts.set(key, existing);
    }

    for (const [pattern, data] of blockerCounts) {
      if (data.count >= 3) {
        const payload = JSON.parse(pattern);
        const question = `Investigate repeated blocker: ${payload.issue || payload.description || pattern}`;
        await this.researchQueue.add({
          question,
          context: `Blocker occurred ${data.count} times today`,
          trigger: "blocker",
          priority: "p1",
          namespace: "content",
        });

        state.repeated_blockers.push({
          pattern,
          count: data.count,
          research_created: true,
        });
      }
    }

    // 3. Research queue health
    const items = await this.researchQueue.list();
    for (const item of items) {
      if (item.status === "queued") state.research_queue_health.queued++;
      else if (item.status === "active") state.research_queue_health.active++;
      else if (item.status === "failed") state.research_queue_health.failed++;
      else if (item.status === "dead") state.research_queue_health.dead++;
    }

    // Write state
    const statePath = this.engine.resolvePath("state", "heartbeat.json");
    await this.engine.enqueueWrite(statePath, JSON.stringify(state, null, 2), "overwrite");

    return state;
  }
}
