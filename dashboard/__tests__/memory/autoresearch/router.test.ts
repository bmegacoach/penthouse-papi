import { describe, it, expect } from "vitest";
import { routeSources } from "@/lib/memory/autoresearch/router";

describe("routeSources", () => {
  it("routes market trends to perplexity + ahrefs", () => {
    const sources = routeSources("What are the latest market trends in real estate?");
    expect(sources).toContain("perplexity");
    expect(sources).toContain("ahrefs");
  });

  it("routes competitor content to youtube + reddit", () => {
    const sources = routeSources("What video content are competitors posting?");
    expect(sources).toContain("youtube");
    expect(sources).toContain("reddit");
  });

  it("routes SEO queries to ahrefs + perplexity", () => {
    const sources = routeSources("What backlink strategies improve domain ranking?");
    expect(sources).toContain("ahrefs");
    expect(sources).toContain("perplexity");
  });

  it("routes viral/community questions to reddit + youtube", () => {
    const sources = routeSources("What viral hooks are working in subreddits this week?");
    expect(sources).toContain("reddit");
    expect(sources).toContain("youtube");
  });

  it("respects source_hint override", () => {
    const sources = routeSources("What are the latest market trends?", ["youtube"]);
    expect(sources).toEqual(["youtube"]);
    expect(sources).not.toContain("perplexity");
  });
});
