import type { MemoryEngine } from "./engine";
import type { DailyWriter } from "./daily-writer";
import type { EventLogger } from "./event-logger";
import type { KnowledgeManager } from "./knowledge-manager";
import type { TacitManager } from "./tacit-manager";
import type { ConsolidationState } from "./types";

export class Consolidator {
  constructor(
    private engine: MemoryEngine,
    private daily: DailyWriter,
    private events: EventLogger,
    private km: KnowledgeManager,
    private tm: TacitManager,
  ) {}

  async run(date?: Date): Promise<ConsolidationState> {
    const release = await this.engine.acquireLock(".consolidation.lock");

    try {
      const targetDate = date || new Date();
      const dailyContent = await this.daily.readDate(targetDate);
      const dayEvents = await this.events.readDate(targetDate);

      const state: ConsolidationState = {
        last_run: new Date().toISOString(),
        files_updated: [],
        patterns_found: [],
        tacit_proposals: [],
        manifest: [],
      };

      if (!dailyContent && dayEvents.length === 0) {
        await this.writeState(state);
        return state;
      }

      // Pass 1: Fact extraction
      const facts = this.extractFacts(dailyContent || "");

      // Pass 2: Entity updates — match facts to existing L2 entities by keyword overlap
      const namespaces = await this.km.listNamespaces();
      for (const ns of namespaces) {
        const entities = await this.km.list(ns);
        for (const entity of entities) {
          const slug = entity.title.toLowerCase();
          const matchingFacts = facts.filter(f =>
            f.toLowerCase().includes(slug) ||
            slug.split("-").some(w => w.length > 3 && f.toLowerCase().includes(w))
          );
          if (matchingFacts.length > 0) {
            const updated = entity.content + "\n\n## Consolidated " + targetDate.toISOString().split("T")[0] + "\n\n" + matchingFacts.join("\n");
            await this.km.upsert(ns, entity.title, updated, "consolidation");
            state.files_updated.push(entity.path);
          }
        }
      }

      if (facts.length > 0) {
        state.patterns_found.push(...facts);
      }

      // Pass 3: Pattern detection (scan events for repeated types)
      const blockerCounts = new Map<string, number>();
      for (const event of dayEvents) {
        if (event.type === "blocker") {
          const key = JSON.stringify(event.payload);
          blockerCounts.set(key, (blockerCounts.get(key) || 0) + 1);
        }
      }

      // Pass 4: Tacit proposals from patterns
      for (const [pattern, count] of blockerCounts) {
        if (count >= 3) {
          state.tacit_proposals.push(`Repeated blocker (${count}x): ${pattern}`);
        }
      }

      // Pass 5: Deduplication & archival — skipped in MVP

      // Pass 6: Index refresh — rebuild manifest (reuse namespaces from Pass 2)
      for (const ns of namespaces) {
        const entities = await this.km.list(ns);
        for (const entity of entities) {
          state.manifest.push({ path: entity.path, type: "L2", namespace: ns });
        }
      }

      const tacitRules = await this.tm.list();
      for (const rule of tacitRules) {
        state.manifest.push({ path: rule.path, type: "L3", namespace: "tacit" });
      }

      await this.writeState(state);
      return state;
    } finally {
      await release();
    }
  }

  private extractFacts(content: string): string[] {
    const facts: string[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      // Heuristic: lines with numbers, percentages, or URLs are likely facts
      if (/\d+\.?\d*%/.test(trimmed) || /\d{2,}/.test(trimmed) || /https?:\/\//.test(trimmed)) {
        if (trimmed.length > 10 && trimmed.length < 500) {
          facts.push(trimmed);
        }
      }
    }

    return facts;
  }

  private async writeState(state: ConsolidationState): Promise<void> {
    const statePath = this.engine.resolvePath("state", "consolidation.json");
    await this.engine.enqueueWrite(statePath, JSON.stringify(state, null, 2), "overwrite");
  }
}
