import { NextRequest, NextResponse } from "next/server";
import { getResearchQueue } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keyword, competitor_url, brand } = body;

  if (!keyword && !competitor_url) {
    return NextResponse.json({ error: "keyword or competitor_url required" }, { status: 400 });
  }

  const queue = await getResearchQueue();
  const items: string[] = [];

  if (keyword) {
    // Queue keyword research
    const id1 = await queue.add({
      question: `SEO keyword analysis: "${keyword}" — search volume, competition, content gaps, top ranking pages, and recommended content angles for ${brand || "GBB"}`,
      context: `SEO research for ${brand || "GBB"} content strategy`,
      trigger: "manual",
      priority: "p1",
      namespace: "content",
      source_hint: ["perplexity", "ahrefs"],
    });
    items.push(id1);
  }

  if (competitor_url) {
    // Queue competitor analysis
    const id2 = await queue.add({
      question: `Competitor SEO analysis for ${competitor_url} — top pages, backlinks, content strategy, keyword gaps vs ${brand || "GBB"}`,
      context: `Competitor research for ${brand || "GBB"}`,
      trigger: "manual",
      priority: "p1",
      namespace: "content",
      source_hint: ["perplexity", "ahrefs"],
    });
    items.push(id2);
  }

  return NextResponse.json({ queued: items.length, ids: items });
}
