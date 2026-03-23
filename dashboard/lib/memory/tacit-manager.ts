import { readdir } from "node:fs/promises";
import { basename } from "node:path";
import type { MemoryEngine } from "./engine";
import type { TacitRule } from "./types";

export class TacitManager {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private rulePath(slug: string): string {
    return this.engine.resolvePath("tacit", `${slug}.md`);
  }

  async read(slug: string): Promise<TacitRule | null> {
    const path = this.rulePath(slug);
    const raw = await this.engine.readFile(path);
    if (!raw) return null;

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    const content = fmMatch ? fmMatch[2] : raw;
    const fm = fmMatch ? fmMatch[1] : "";
    const confidence = parseInt(fm.match(/confidence:\s*(\d+)/)?.[1] || "0", 10);
    const updated = fm.match(/updated_at:\s*(.+)/)?.[1] || "";
    const origin = fm.match(/origin_daily_note:\s*(.+)/)?.[1];

    return { path, title: slug, content, confidence, origin_daily_note: origin, updated_at: updated };
  }

  async list(): Promise<TacitRule[]> {
    const dir = this.engine.resolvePath("tacit");
    try {
      const files = await readdir(dir);
      const rules: TacitRule[] = [];
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const slug = basename(f, ".md");
        const rule = await this.read(slug);
        if (rule) rules.push(rule);
      }
      return rules;
    } catch {
      return [];
    }
  }

  async write(slug: string, content: string, confidence: number, isConsolidation = false, originNote?: string): Promise<void> {
    if (!isConsolidation) {
      throw new Error("Tacit rules can only be written during consolidation. Use propose() for suggestions.");
    }

    const path = this.rulePath(slug);
    const header = `---\ntitle: ${slug}\nconfidence: ${confidence}\nupdated_at: ${new Date().toISOString()}${originNote ? `\norigin_daily_note: ${originNote}` : ""}\n---\n\n`;
    await this.engine.enqueueWrite(path, header + content, "overwrite");
  }
}
