#!/usr/bin/env npx tsx
/**
 * Auto-Researcher Runner
 *
 * Processes queued research items using configured API sources.
 * Run manually or via cron: npx tsx scripts/run-researcher.ts
 *
 * Env vars (from .env.local):
 *   PERPLEXITY_API_KEY  — required for synthesis + Perplexity source
 *   YOUTUBE_API_KEY     — optional, enables YouTube source
 */

import { resolve } from "node:path";
import { MemoryEngine } from "../lib/memory/engine";
import { AutoresearchWorker } from "../lib/memory/autoresearch/worker";
import { ResearchQueue } from "../lib/memory/autoresearch/queue";

// Env vars are set by the calling shell script (scripts/run-researcher.sh)
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;

async function main() {
  if (!PERPLEXITY_KEY) {
    console.error("ERROR: PERPLEXITY_API_KEY not set in .env.local");
    process.exit(1);
  }

  console.log("[researcher] Starting auto-researcher...");
  console.log(`[researcher] Perplexity: ✓  YouTube: ${YOUTUBE_KEY ? "✓" : "✗"}`);

  const engine = await MemoryEngine.create(resolve(__dirname, ".."));
  const worker = new AutoresearchWorker(engine, {
    perplexityApiKey: PERPLEXITY_KEY,
    youtubeApiKey: YOUTUBE_KEY,
  });
  const queue = new ResearchQueue(engine);

  // Show queue status
  const items = await queue.list();
  const queued = items.filter(i => i.status === "queued").length;
  const active = items.filter(i => i.status === "active").length;
  const failed = items.filter(i => i.status === "failed").length;

  console.log(`[researcher] Queue: ${queued} queued, ${active} active, ${failed} failed`);

  if (queued === 0 && active === 0 && failed === 0) {
    console.log("[researcher] Nothing to process. Exiting.");
    return;
  }

  // Process up to 5 items per run
  let processed = 0;
  const maxPerRun = 5;

  while (processed < maxPerRun) {
    const item = await worker.processNext();
    if (!item) {
      console.log("[researcher] No more items to process.");
      break;
    }
    processed++;
    console.log(`[researcher] Processed: "${item.question}" (${item.status})`);
  }

  console.log(`[researcher] Done. Processed ${processed} items.`);
}

main().catch((err) => {
  console.error("[researcher] Fatal:", err);
  process.exit(1);
});
