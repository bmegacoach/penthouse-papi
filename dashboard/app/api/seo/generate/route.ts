import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/llm/openrouter";
import { getDailyWriter } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, topic, brand, keywords, tone } = body;

  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });

  const brandVoice = brand === "CoachAI"
    ? "energetic, accessible, future-forward, speak to parents and teens"
    : brand === "OpenChief"
    ? "technical, direct, builder tone, show don't tell"
    : "authoritative, data-driven, contrarian angles, never hype, always cite numbers";

  const prompts: Record<string, string> = {
    article: `Write a comprehensive SEO article about "${topic}". Target keywords: ${keywords || topic}. Brand voice: ${brandVoice}. Include: H2/H3 headers, FAQ section, meta title, meta description. Length: 1500-2000 words.`,
    brief: `Create a detailed content brief for "${topic}". Include: target keywords, search intent, outline with H2/H3, competitor angle, unique value proposition, internal link suggestions. Brand: ${brand || "GBB"}.`,
    social: `Create a social media content pack for "${topic}". Include: 1 LinkedIn post (300 words), 3 Twitter/X posts, 1 Instagram caption, 1 YouTube Shorts script (60 seconds). Brand voice: ${brandVoice}.`,
    meta: `Generate SEO metadata for a page about "${topic}": meta title (60 chars), meta description (155 chars), 5 focus keywords, 3 LSI keywords, URL slug suggestion.`,
    landing: `Write landing page copy for "${topic}". Include: hero headline + subheadline, 3 benefit sections, social proof section, FAQ (5 questions), CTA copy. Brand voice: ${brandVoice}. Conversion-focused.`,
  };

  const systemPrompt = `You are the SEO Agent inside Penthouse Papi Content Creator Suite, operating under OpenChief. You produce high-quality content for ${brand || "Goldbackbond (GBB)"}.`;
  const userPrompt = prompts[type || "brief"] || prompts.brief;

  // suppress unused variable warning
  void tone;

  try {
    const content = await generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    // Log to daily notes
    const dw = await getDailyWriter();
    await dw.append(`## SEO Content Generated: ${type || "brief"} — ${topic}\n\n${content.slice(0, 200)}...`, "seo-agent", ["content_generated"]);

    return NextResponse.json({ content, type: type || "brief", topic, brand: brand || "GBB" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 500 });
  }
}
