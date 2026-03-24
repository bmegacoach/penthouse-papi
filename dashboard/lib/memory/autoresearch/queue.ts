import { randomUUID } from "node:crypto";
import type { MemoryEngine } from "../engine";
import type { ResearchItem, ResearchSource } from "../types";

interface AddInput {
  question: string;
  context: string;
  trigger: ResearchItem["trigger"];
  priority: ResearchItem["priority"];
  namespace: string;
  source_hint?: ResearchSource[];
}

export class ResearchQueue {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private queuePath(): string {
    return this.engine.resolvePath("research", "queue.json");
  }

  async list(): Promise<ResearchItem[]> {
    const raw = await this.engine.readFile(this.queuePath());
    return raw ? JSON.parse(raw) : [];
  }

  private async save(items: ResearchItem[]): Promise<void> {
    await this.engine.enqueueWrite(this.queuePath(), JSON.stringify(items, null, 2), "overwrite");
  }

  async add(input: AddInput): Promise<string> {
    const items = await this.list();
    const id = randomUUID();
    const item: ResearchItem = { id, ...input, status: "queued", retries: 0, created_at: new Date().toISOString() };
    items.push(item);
    await this.save(items);
    return id;
  }

  async claimNext(): Promise<ResearchItem | null> {
    const items = await this.list();
    const now = Date.now();
    const priorityOrder = ["p1", "p2", "p3"];

    // Re-queue failed items whose backoff delay has elapsed
    for (const item of items) {
      if (item.status === "failed" && item.started_at) {
        const backoffMs = Math.pow(2, item.retries) * 15 * 60 * 1000;
        const failedAt = new Date(item.started_at).getTime();
        if (now - failedAt >= backoffMs) {
          item.status = "queued";
        }
      }
    }
    await this.save(items);

    const queued = items
      .filter(i => i.status === "queued")
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

    if (queued.length === 0) return null;
    return this.claim(queued[0].id);
  }

  async claim(id: string): Promise<ResearchItem | null> {
    const items = await this.list();
    const item = items.find(i => i.id === id);
    if (!item) return null;
    item.status = "active";
    item.started_at = new Date().toISOString();
    await this.save(items);
    return item;
  }

  async complete(id: string, result: ResearchItem["result"]): Promise<void> {
    const items = await this.list();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const item = items[idx];
    item.status = "complete";
    item.completed_at = new Date().toISOString();
    item.result = result;
    items.splice(idx, 1);
    await this.save(items);
    await this.saveCompleted(item);
  }

  async fail(id: string, error: string): Promise<void> {
    const items = await this.list();
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.retries += 1;
    item.error = error;
    if (item.retries >= 3) {
      item.status = "dead";
      item.completed_at = new Date().toISOString();
      const idx = items.indexOf(item);
      items.splice(idx, 1);
      await this.save(items);
      await this.saveCompleted(item);
    } else {
      item.status = "failed";
      await this.save(items);
    }
  }

  private async saveCompleted(item: ResearchItem): Promise<void> {
    const filePath = this.engine.resolvePath("research", "completed", `${item.id}.json`);
    await this.engine.enqueueWrite(filePath, JSON.stringify(item, null, 2), "overwrite");
  }
}
