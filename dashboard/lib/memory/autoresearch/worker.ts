import type { MemoryEngine } from "../engine";
import type { ResearchItem } from "../types";
import { ResearchQueue } from "./queue";
import { routeSources } from "./router";
import { queryPerplexity } from "./sources/perplexity";
import { queryYouTube } from "./sources/youtube";
import { queryReddit } from "./sources/reddit";
import { queryAhrefs } from "./sources/ahrefs";
import { synthesize } from "./synthesizer";
import { DailyWriter } from "../daily-writer";
import { KnowledgeManager } from "../knowledge-manager";

interface WorkerConfig {
  perplexityApiKey?: string;
  youtubeApiKey?: string;
}

export class AutoresearchWorker {
  private engine: MemoryEngine;
  private queue: ResearchQueue;
  private daily: DailyWriter;
  private km: KnowledgeManager;
  private config: WorkerConfig;

  constructor(engine: MemoryEngine, config: WorkerConfig) {
    this.engine = engine;
    this.queue = new ResearchQueue(engine);
    this.daily = new DailyWriter(engine);
    this.km = new KnowledgeManager(engine);
    this.config = config;
  }

  async processNext(): Promise<ResearchItem | null> {
    const item = await this.queue.claimNext();
    if (!item) return null;

    try {
      const sources = routeSources(item.question, item.source_hint);
      const sourceResults: { source: string; data: string }[] = [];
      const failedSources: string[] = [];

      for (const source of sources) {
        try {
          const data = await this.querySource(source, item.question);
          if (data) sourceResults.push({ source, data });
        } catch (err) {
          failedSources.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (sourceResults.length === 0) {
        await this.queue.fail(item.id, `All sources failed: ${failedSources.join("; ")}`);
        return item;
      }

      if (!this.config.perplexityApiKey) {
        await this.daily.append(
          `## Research Raw: ${item.question}\n\n${sourceResults.map(s => `**${s.source}:**\n${s.data}`).join("\n\n")}`,
          "autoresearcher", ["research_raw"],
        );
        await this.queue.fail(item.id, "No Perplexity API key for synthesis");
        return item;
      }

      const result = await synthesize(
        { question: item.question, context: item.context, sourceResults },
        this.config.perplexityApiKey,
      );
      result.partial = failedSources.length > 0;

      await this.daily.append(`## Research Complete: ${item.question}\n\n${result.summary}`, "autoresearcher", ["research_complete"]);

      for (const update of result.knowledge_updates) {
        await this.km.upsert(item.namespace, this.slugify(item.question), update, "autoresearch");
      }

      for (const proposal of result.tacit_proposals) {
        await this.daily.append(`**Tacit Proposal:** ${proposal}`, "autoresearcher", ["tacit_proposal"]);
      }

      await this.queue.complete(item.id, result);
      return item;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.daily.append(`## Research Failed: ${item.question}\n\nError: ${msg}`, "autoresearcher", ["research_raw"]);
      await this.queue.fail(item.id, msg);
      return item;
    }
  }

  private async querySource(source: string, question: string): Promise<string | null> {
    switch (source) {
      case "perplexity": {
        if (!this.config.perplexityApiKey) return null;
        const r = await queryPerplexity(question, this.config.perplexityApiKey);
        return `${r.answer}\n\nCitations: ${r.citations.join(", ")}`;
      }
      case "youtube": {
        if (!this.config.youtubeApiKey) return null;
        const r = await queryYouTube(question, this.config.youtubeApiKey);
        return r.videos.map(v => `- "${v.title}" by ${v.channelTitle} (${v.viewCount} views)`).join("\n");
      }
      case "reddit": {
        const r = await queryReddit(question);
        return r.posts.map(p => `- [${p.score}] ${p.title} (r/${p.subreddit}, ${p.num_comments} comments)`).join("\n");
      }
      case "ahrefs": {
        const r = await queryAhrefs(question);
        if (!r.available) return null;
        return JSON.stringify(r.data);
      }
      default: return null;
    }
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
  }
}
