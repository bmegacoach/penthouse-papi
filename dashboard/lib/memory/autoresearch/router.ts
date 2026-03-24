import type { ResearchSource } from "../types";

const ROUTE_RULES: { keywords: string[]; primary: ResearchSource; secondary?: ResearchSource }[] = [
  { keywords: ["trend", "market", "news", "economy", "price", "forecast"], primary: "perplexity", secondary: "ahrefs" },
  { keywords: ["competitor", "channel", "video", "content", "post"], primary: "youtube", secondary: "reddit" },
  { keywords: ["seo", "keyword", "traffic", "ranking", "backlink", "domain"], primary: "ahrefs", secondary: "perplexity" },
  { keywords: ["viral", "hook", "reddit", "community", "trending", "subreddit"], primary: "reddit", secondary: "youtube" },
  { keywords: ["how to", "tutorial", "guide", "documentation", "technical"], primary: "perplexity" },
];

export function routeSources(question: string, sourceHint?: ResearchSource[]): ResearchSource[] {
  if (sourceHint?.length) return sourceHint;
  const q = question.toLowerCase();
  for (const rule of ROUTE_RULES) {
    if (rule.keywords.some(k => q.includes(k))) {
      const sources: ResearchSource[] = [rule.primary];
      if (rule.secondary) sources.push(rule.secondary);
      return sources;
    }
  }
  return ["perplexity"];
}
