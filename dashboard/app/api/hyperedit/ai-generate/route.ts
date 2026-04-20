import { NextResponse } from "next/server";
import { createJob, getJob, updateJob } from "@/lib/hyperedit/jobs";
import { generateVideo, pollVideo } from "@/lib/ai-video/client";
import type { VideoProvider } from "@/lib/ai-video/types";

interface Body {
  provider: VideoProvider;
  prompt: string;
  brand?: string;
  platforms?: string[];
  maxClips?: number;
  conceptId?: string;
  model?: string;
  durationSec?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  referenceImage?: string;
  adMode?: boolean;
  name?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.provider || !["minimax", "seedance"].includes(body.provider)) {
    return NextResponse.json({ error: "provider must be 'minimax' or 'seedance'" }, { status: 400 });
  }
  if (!body.prompt || body.prompt.trim().length < 3) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const aspectRatio = body.aspectRatio || "9:16";
  const job = await createJob({
    name: body.name || `AI ${body.provider} — ${body.prompt.slice(0, 48)}`,
    source: "ai",
    sourcePath: "",
    brand: body.brand || "OpenChief",
    platforms: body.platforms || ["reels", "shorts", "tiktok"],
    maxClips: body.maxClips ?? 1,
    conceptId: body.conceptId,
    aiVideo: {
      provider: body.provider,
      model: body.model,
      prompt: body.prompt,
      referenceImage: body.referenceImage,
      durationSec: body.durationSec,
      aspectRatio,
      adMode: Boolean(body.adMode),
    },
  });

  try {
    const task = await generateVideo({
      provider: body.provider,
      prompt: body.prompt,
      model: body.model,
      referenceImage: body.referenceImage,
      durationSec: body.durationSec,
      aspectRatio,
      adMode: Boolean(body.adMode),
      brand: body.brand,
    });
    await updateJob(job.id, {
      status: "generating",
      progress: 20,
      aiVideo: { ...job.aiVideo!, taskId: task.taskId, model: task.model || job.aiVideo?.model },
    });
    return NextResponse.json({ jobId: job.id, provider: body.provider, taskId: task.taskId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "generation failed";
    await updateJob(job.id, { status: "failed", error: msg, progress: 0 });
    return NextResponse.json({ jobId: job.id, error: msg }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job || !job.aiVideo?.taskId) {
    return NextResponse.json({ error: "job not found or not AI-sourced" }, { status: 404 });
  }

  try {
    const task = await pollVideo(job.aiVideo.provider, job.aiVideo.taskId);
    const updates: Record<string, unknown> = { progress: task.progress ?? job.progress };
    if (task.status === "succeeded" && task.videoUrl) {
      updates.status = "ready";
      updates.progress = 100;
      updates.sourcePath = task.videoUrl;
      updates.clips = 1;
    } else if (task.status === "failed") {
      updates.status = "failed";
      updates.error = task.error || "generation failed";
    } else if (task.status === "running") {
      updates.status = "generating";
    }
    const updated = await updateJob(jobId, updates);
    return NextResponse.json({ job: updated, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "poll failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
