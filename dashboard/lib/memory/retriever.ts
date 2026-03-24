import type { MemoryEngine } from "./engine";
import type { KnowledgeManager } from "./knowledge-manager";
import type { TacitManager } from "./tacit-manager";
import type { DailyWriter } from "./daily-writer";

interface SearchResult {
  source: string;
  content: string;
  path?: string;
}

interface SearchResponse {
  layer: "L1" | "L2" | "L3";
  results: SearchResult[];
  query: string;
}

type LayerKey = "L1" | "L2" | "L3";

const TEMPORAL_WORDS = ["yesterday", "today", "last week", "this week", "this morning", "earlier", "recent"];
const BEHAVIORAL_WORDS = ["rule", "preference", "how do we", "pattern", "always", "never", "convention", "should we"];

export class Retriever {
  constructor(
    private engine: MemoryEngine,
    private km: KnowledgeManager,
    private tm: TacitManager,
    private dw: DailyWriter,
  ) {}

  classifyIntent(query: string): LayerKey {
    const q = query.toLowerCase();
    if (TEMPORAL_WORDS.some(w => q.includes(w))) return "L1";
    if (BEHAVIORAL_WORDS.some(w => q.includes(w))) return "L3";
    return "L2";
  }

  async search(query: string, namespace?: string): Promise<SearchResponse> {
    const primaryLayer = this.classifyIntent(query);
    const fallbackOrder: LayerKey[] =
      primaryLayer === "L1" ? ["L1", "L2", "L3"] :
      primaryLayer === "L3" ? ["L3", "L2", "L1"] :
      ["L2", "L1", "L3"];

    for (const layer of fallbackOrder) {
      const results = await this.searchLayer(layer, query, namespace);
      if (results.length > 0) {
        return { layer, results, query };
      }
    }

    return { layer: primaryLayer, results: [], query };
  }

  private async searchLayer(layer: LayerKey, query: string, namespace?: string): Promise<SearchResult[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (layer === "L1") {
      return this.searchDailyNotes(keywords);
    } else if (layer === "L2") {
      return this.searchKnowledge(keywords, namespace);
    } else {
      return this.searchTacit(keywords);
    }
  }

  private async searchDailyNotes(keywords: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const content = await this.dw.readDate(date);
      if (!content) continue;
      const lower = content.toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        const label = i === 0 ? "today" : `${i}d ago`;
        results.push({ source: `daily-notes (${label})`, content });
      }
    }
    return results;
  }

  private async searchKnowledge(keywords: string[], namespace?: string): Promise<SearchResult[]> {
    const namespaces = namespace ? [namespace] : await this.km.listNamespaces();
    const results: SearchResult[] = [];

    for (const ns of namespaces) {
      const entities = await this.km.list(ns);
      for (const entity of entities) {
        const haystack = `${entity.title} ${entity.content}`.toLowerCase();
        if (keywords.some(k => haystack.includes(k))) {
          results.push({ source: `knowledge/${ns}/${entity.title}`, content: entity.content, path: entity.path });
        }
      }
    }

    return results;
  }

  private async searchTacit(keywords: string[]): Promise<SearchResult[]> {
    const rules = await this.tm.list();
    const results: SearchResult[] = [];

    for (const rule of rules) {
      const haystack = `${rule.title} ${rule.content}`.toLowerCase();
      if (keywords.some(k => haystack.includes(k))) {
        results.push({ source: `tacit/${rule.title}`, content: rule.content, path: rule.path });
      }
    }

    return results;
  }
}
