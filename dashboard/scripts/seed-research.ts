#!/usr/bin/env npx tsx
/**
 * Seed the research queue with initial questions.
 * Run once to populate, then run-researcher.ts processes them.
 *
 * Usage: npx tsx scripts/seed-research.ts
 */

import { resolve } from "node:path";
import { MemoryEngine } from "../lib/memory/engine";
import { ResearchQueue } from "../lib/memory/autoresearch/queue";

const SEED_QUESTIONS = [
  {
    question: "What are the top gold ETF trends for Q2 2026?",
    context: "GBB FX signals focus on XAUUSD. Need current market intelligence for signal commentary.",
    trigger: "scheduled" as const,
    priority: "p1" as const,
    namespace: "market-intel",
    source_hint: ["perplexity" as const],
  },
  {
    question: "Best forex managed account structures for US and LATAM clients in 2026",
    context: "GBB offers PAMM (LATAM/Axi) and LPOA (US/Trade Smart FX). Need competitive landscape.",
    trigger: "manual" as const,
    priority: "p1" as const,
    namespace: "market-intel",
    source_hint: ["perplexity" as const, "youtube" as const],
  },
  {
    question: "Top performing forex YouTube channels and their content strategies 2026",
    context: "Penthouse Papi content desk needs competitive content intelligence for GBB brand.",
    trigger: "manual" as const,
    priority: "p2" as const,
    namespace: "content",
    source_hint: ["youtube" as const, "reddit" as const],
  },
  {
    question: "Reddit sentiment on AI-powered trading signal services",
    context: "Agency platform positioning — understand community trust and objections.",
    trigger: "manual" as const,
    priority: "p2" as const,
    namespace: "content",
    source_hint: ["reddit" as const, "perplexity" as const],
  },
  {
    question: "How are treasury desks using AI for risk management in 2026?",
    context: "Education module positioning. GBB teaches treasury-grade thinking to retail traders.",
    trigger: "manual" as const,
    priority: "p2" as const,
    namespace: "market-intel",
    source_hint: ["perplexity" as const],
  },
];

async function main() {
  const engine = await MemoryEngine.create(resolve(__dirname, ".."));
  const queue = new ResearchQueue(engine);

  const existing = await queue.list();
  if (existing.length > 0) {
    console.log(`[seed] Queue already has ${existing.length} items. Skipping seed.`);
    console.log("[seed] To re-seed, clear research/queue.json first.");
    return;
  }

  for (const q of SEED_QUESTIONS) {
    const id = await queue.add(q);
    console.log(`[seed] Added: "${q.question}" (${q.priority}) → ${id}`);
  }

  console.log(`[seed] Seeded ${SEED_QUESTIONS.length} research questions.`);
}

main().catch((err) => {
  console.error("[seed] Fatal:", err);
  process.exit(1);
});
