import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import type { MemoryEngine } from "./engine";
import type { KnowledgeEntity } from "./types";

export class KnowledgeManager {
  private engine: MemoryEngine;

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private entityPath(namespace: string, slug: string): string {
    return this.engine.resolvePath("knowledge", namespace, `${slug}.md`);
  }

  private isShared(namespace: string): boolean {
    return this.engine.config.sync.sharedNamespaces.includes(namespace);
  }

  async upsert(namespace: string, slug: string, content: string, source: "consolidation" | "autoresearch" | "manual" | "seed" = "manual"): Promise<void> {
    if (this.isShared(namespace) && this.engine.config.tier !== "chiefos") {
      throw new Error(`Cannot write to shared namespace "${namespace}" from tier "${this.engine.config.tier}"`);
    }

    const path = this.entityPath(namespace, slug);
    const header = `---\nnamespace: ${namespace}\ntitle: ${slug}\nupdated_at: ${new Date().toISOString()}\nsource: ${source}\n---\n\n`;
    await this.engine.enqueueWrite(path, header + content, "overwrite");
  }

  async read(namespace: string, slug: string): Promise<KnowledgeEntity | null> {
    const path = this.entityPath(namespace, slug);
    const raw = await this.engine.readFile(path);
    if (!raw) return null;

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    const content = fmMatch ? fmMatch[2] : raw;
    const fm = fmMatch ? fmMatch[1] : "";
    const updated = fm.match(/updated_at:\s*(.+)/)?.[1] || "";
    const src = fm.match(/source:\s*(.+)/)?.[1] || "manual";

    return {
      path,
      namespace,
      title: slug,
      content,
      updated_at: updated,
      source: src as KnowledgeEntity["source"],
    };
  }

  async list(namespace: string): Promise<KnowledgeEntity[]> {
    const dir = this.engine.resolvePath("knowledge", namespace);
    try {
      const files = await readdir(dir);
      const entities: KnowledgeEntity[] = [];
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const slug = basename(f, ".md");
        const entity = await this.read(namespace, slug);
        if (entity) entities.push(entity);
      }
      return entities;
    } catch {
      return [];
    }
  }

  async listNamespaces(): Promise<string[]> {
    const dir = this.engine.resolvePath("knowledge");
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory() && e.name !== "_archived").map(e => e.name);
    } catch {
      return [];
    }
  }
}
