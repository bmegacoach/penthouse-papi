import type { MemoryEngine } from "./engine";

export class DailyWriter {
  private engine: MemoryEngine;
  private initialized = new Set<string>();

  constructor(engine: MemoryEngine) {
    this.engine = engine;
  }

  private getDateParts(date?: Date): { year: string; month: string; day: string; full: string } {
    const d = date || new Date();
    const full = d.toISOString().split("T")[0];
    const [year, month] = full.split("-");
    return { year, month, day: full.split("-")[2], full };
  }

  private getDailyPath(date?: Date): string {
    const { year, month, full } = this.getDateParts(date);
    return this.engine.resolvePath("daily", year, month, `${full}.md`);
  }

  async append(content: string, source: string, tags?: string[], date?: Date): Promise<void> {
    const notePath = this.getDailyPath(date);
    const { full } = this.getDateParts(date);
    const time = new Date().toISOString().split("T")[1].split(".")[0];

    if (!this.initialized.has(full)) {
      const exists = await this.engine.fileExists(notePath);
      if (!exists) {
        const header = `# Daily Notes — ${full}\n\n`;
        await this.engine.enqueueWrite(notePath, header, "overwrite");
      }
      this.initialized.add(full);
    }

    const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
    const entry = `\n**${time}** (${source})${tagStr}\n${content}\n`;
    await this.engine.enqueueWrite(notePath, entry, "append");
  }

  async readToday(): Promise<string | null> {
    return this.engine.readFile(this.getDailyPath());
  }

  async readDate(date: Date): Promise<string | null> {
    return this.engine.readFile(this.getDailyPath(date));
  }
}
