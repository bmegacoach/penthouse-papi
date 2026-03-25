import { listJobs, updateJob } from "./jobs";
import { generate } from "@/lib/llm/openrouter";
import type { HypereditJob } from "./types";

// Process the next queued job
export async function processNextJob(): Promise<HypereditJob | null> {
  const jobs = await listJobs();
  const queued = jobs.filter(j => j.status === "queued");
  if (queued.length === 0) return null;

  const job = queued[0];

  try {
    // Stage 1: Planning
    await updateJob(job.id, { status: "planning", progress: 10 });

    const planPrompt = `You are a video content strategist for Penthouse Papi Content Studio.

Analyze this video for clip extraction:
- Video: "${job.name}"
- Brand: ${job.brand}
- Target Platforms: ${job.platforms.join(", ")}
- Max Clips: ${job.maxClips}

Generate a clip plan as JSON:
{
  "clips": [
    {
      "title": "clip title for social media",
      "hook": "opening hook line (first 3 seconds)",
      "description": "what this clip covers",
      "platform": "reels|shorts|linkedin|twitter",
      "estimated_duration": "30s|60s|90s",
      "script_outline": "brief script or talking points"
    }
  ],
  "content_summary": "2-3 sentence summary of the full video content",
  "brand_alignment": "how this content aligns with the brand"
}

Generate exactly ${job.maxClips} clips optimized for the target platforms.`;

    let clipPlan: any = { clips: [], content_summary: "", brand_alignment: "" };

    try {
      const planResult = await generate({
        messages: [
          { role: "system", content: "You are a video content strategist. Always respond with valid JSON." },
          { role: "user", content: planPrompt },
        ],
        temperature: 0.7,
      });

      // Extract JSON from response
      const jsonMatch = planResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        clipPlan = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If LLM fails, create basic clip plan
      clipPlan = {
        clips: Array.from({ length: Math.min(job.maxClips, 3) }, (_, i) => ({
          title: `${job.name} — Clip ${i + 1}`,
          hook: "Watch this...",
          description: `Clip ${i + 1} from ${job.name}`,
          platform: job.platforms[i % job.platforms.length] || "reels",
          estimated_duration: "60s",
          script_outline: "Auto-generated clip",
        })),
        content_summary: `Content from ${job.name}`,
        brand_alignment: `${job.brand} content`,
      };
    }

    await updateJob(job.id, { status: "planning", progress: 30 });

    // Stage 2: Transcribing (simulated for MVP — real Whisper in Phase 2)
    await updateJob(job.id, { status: "transcribing", progress: 50 });

    // In Phase 2 this will call OpenAI Whisper API:
    // const transcript = await whisperTranscribe(job.sourcePath);

    await updateJob(job.id, { status: "transcribing", progress: 65 });

    // Stage 3: Rendering (simulated for MVP — real ffmpeg in Phase 2)
    await updateJob(job.id, { status: "rendering", progress: 75 });

    // In Phase 2 this will call ffmpeg to cut clips based on timestamps

    const clipCount = clipPlan.clips?.length || 0;
    await updateJob(job.id, { status: "rendering", progress: 90 });

    // Stage 4: Done
    await updateJob(job.id, {
      status: "ready",
      progress: 100,
      clips: clipCount,
    });

    // Store clip plan in memory for retrieval
    try {
      const { getDailyWriter } = await import("@/lib/memory/server");
      const dw = await getDailyWriter();
      await dw.append(
        `## Hyperedit Job Complete: ${job.name}\n\nBrand: ${job.brand}\nClips: ${clipCount}\nPlatforms: ${job.platforms.join(", ")}\n\n**Content Summary:** ${clipPlan.content_summary}\n\n**Clips:**\n${clipPlan.clips?.map((c: any, i: number) => `${i + 1}. ${c.title} (${c.platform}, ${c.estimated_duration})\n   Hook: ${c.hook}`).join("\n") || "None"}`,
        "hyperedit-worker",
        ["hyperedit_complete"],
      );
    } catch {
      // Daily writer optional
    }

    return await listJobs().then(jobs => jobs.find(j => j.id === job.id) || null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    await updateJob(job.id, { status: "failed", error: msg, progress: 0 });
    return job;
  }
}

// Process all queued jobs
export async function processAllJobs(): Promise<number> {
  let processed = 0;
  while (true) {
    const result = await processNextJob();
    if (!result) break;
    processed++;
  }
  return processed;
}
