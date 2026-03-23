import type { MemoryEngine } from "./engine";
import type { MemoryEvent, EventType } from "./types";

interface LogInput {
  type: EventType;
  source: string;
  layer: "L1" | "L2" | "L3";
  namespace?: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

export class EventLogger {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private getEventsPath(date?: Date): string {
    const d = date || new Date();
    const full = d.toISOString().split("T")[0];
    const [year, month] = full.split("-");
    return this.engine.resolvePath("daily", year, month, `${full}.events.json`);
  }

  async log(input: LogInput, date?: Date): Promise<void> {
    const eventsPath = this.getEventsPath(date);
    const event: MemoryEvent = {
      timestamp: new Date().toISOString(),
      ...input,
    };

    const existing = await this.engine.readFile(eventsPath);
    const events: MemoryEvent[] = existing ? JSON.parse(existing) : [];
    events.push(event);

    await this.engine.enqueueWrite(eventsPath, JSON.stringify(events, null, 2), "overwrite");
  }

  async readToday(): Promise<MemoryEvent[]> {
    return this.readDate(new Date());
  }

  async readDate(date: Date): Promise<MemoryEvent[]> {
    const raw = await this.engine.readFile(this.getEventsPath(date));
    return raw ? JSON.parse(raw) : [];
  }
}
