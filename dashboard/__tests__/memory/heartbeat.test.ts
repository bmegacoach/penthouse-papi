import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEngine } from "@/lib/memory/engine";
import { EventLogger } from "@/lib/memory/event-logger";
import { Heartbeat } from "@/lib/memory/heartbeat";
import { ResearchQueue } from "@/lib/memory/autoresearch/queue";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

describe("Heartbeat", () => {
  let tmpDir: string;
  let engine: MemoryEngine;
  let el: EventLogger;
  let rq: ResearchQueue;
  let heartbeat: Heartbeat;

  beforeEach(async () => {
    MemoryEngine.reset();
    tmpDir = join(os.tmpdir(), `heartbeat-test-${Date.now()}`);
    await mkdir(join(tmpDir, "memory", "research"), { recursive: true });
    await mkdir(join(tmpDir, "memory", "state"), { recursive: true });
    engine = await MemoryEngine.create(tmpDir);
    await engine.enqueueWrite(engine.resolvePath("research", "queue.json"), "[]", "overwrite");
    el = new EventLogger(engine);
    rq = new ResearchQueue(engine);
    heartbeat = new Heartbeat(engine, el, rq);
  });

  afterEach(async () => {
    MemoryEngine.reset();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("runs on empty state without errors", async () => {
    const state = await heartbeat.run();
    expect(state.last_run).toBeDefined();
    expect(state.stalled_tasks).toEqual([]);
    expect(state.repeated_blockers).toEqual([]);
  });

  it("detects stalled tasks (task_start with no completion after 2 hours)", async () => {
    // Log a task_start event, then manually backdate its timestamp
    await el.log({
      type: "task_start",
      source: "test-agent",
      layer: "L1",
      payload: { task: "stuck-task", description: "This task is stuck" },
    });

    // Backdate the event to 3 hours ago
    const today = new Date().toISOString().split("T")[0];
    const [year, month] = today.split("-");
    const eventsPath = engine.resolvePath("daily", year, month, `${today}.events.json`);
    const raw = await engine.readFile(eventsPath);
    if (raw) {
      const events = JSON.parse(raw);
      events[0].timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      await engine.enqueueWrite(eventsPath, JSON.stringify(events, null, 2), "overwrite");
    }

    const state = await heartbeat.run();
    expect(state.stalled_tasks.length).toBeGreaterThan(0);
    expect(state.stalled_tasks[0].description).toContain("stuck");
  });

  it("detects repeated blockers and creates research items", async () => {
    for (let i = 0; i < 3; i++) {
      await el.log({
        type: "blocker",
        source: "test",
        layer: "L1",
        payload: { issue: "ffmpeg codec error" },
      });
    }

    const state = await heartbeat.run();
    expect(state.repeated_blockers.length).toBeGreaterThan(0);
    expect(state.repeated_blockers[0].research_created).toBe(true);

    // Verify research item was created
    const items = await rq.list();
    expect(items.length).toBe(1);
    expect(items[0].trigger).toBe("blocker");
  });

  it("reports research queue health", async () => {
    await rq.add({ question: "Q1", context: "", trigger: "manual", priority: "p2", namespace: "content" });
    await rq.add({ question: "Q2", context: "", trigger: "manual", priority: "p1", namespace: "content" });

    const state = await heartbeat.run();
    expect(state.research_queue_health.queued).toBe(2);
  });
});
