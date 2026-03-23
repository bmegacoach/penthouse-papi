import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { MemoryEngine } from "../../lib/memory/engine";
import { EventLogger } from "../../lib/memory/event-logger";

let tmpDir: string;
let engine: MemoryEngine;
let logger: EventLogger;

beforeEach(async () => {
  MemoryEngine.reset();
  tmpDir = join(tmpdir(), `event-logger-test-${Date.now()}`);
  engine = await MemoryEngine.create(tmpDir);
  logger = new EventLogger(engine);
});

afterEach(async () => {
  MemoryEngine.reset();
  await rm(tmpDir, { recursive: true, force: true });
});

describe("EventLogger", () => {
  it("logs an event to today's events.json", async () => {
    await logger.log({
      type: "task_start",
      source: "claude-code",
      layer: "L1",
      payload: { task: "build-dashboard" },
    });
    const events = await logger.readToday();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("task_start");
    expect(events[0].source).toBe("claude-code");
  });

  it("appends multiple events preserving array structure", async () => {
    await logger.log({
      type: "task_start",
      source: "claude-code",
      layer: "L1",
      payload: { task: "first" },
    });
    await logger.log({
      type: "task_complete",
      source: "claude-code",
      layer: "L1",
      payload: { task: "first" },
    });
    const events = await logger.readToday();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("task_start");
    expect(events[1].type).toBe("task_complete");
  });

  it("reads today's events", async () => {
    await logger.log({
      type: "decision",
      source: "troy",
      layer: "L2",
      namespace: "content",
      payload: { decision: "launch-campaign" },
      tags: ["important"],
    });
    const events = await logger.readToday();
    expect(events).toHaveLength(1);
    expect(events[0].namespace).toBe("content");
    expect(events[0].tags).toContain("important");
  });

  it("reads events for a specific date", async () => {
    const pastDate = new Date("2025-06-10");
    await logger.log(
      {
        type: "research_start",
        source: "autoresearcher",
        layer: "L1",
        payload: { query: "test query" },
      },
      pastDate
    );
    const events = await logger.readDate(pastDate);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("research_start");
  });

  it("returns empty array when no events exist", async () => {
    const events = await logger.readToday();
    expect(events).toEqual([]);
  });
});
