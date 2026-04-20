import type { GenerateVideoInput, GenerateVideoTask, ProviderAdapter } from "./types";

const SEEDANCE_BASE = process.env.SEEDANCE_API_BASE || "https://api.seedance.ai/v1";
const SEEDANCE_KEY = process.env.SEEDANCE_API_KEY || "";
const DEFAULT_MODEL = process.env.SEEDANCE_MODEL || "seedance-2.0";

function authHeaders() {
  if (!SEEDANCE_KEY) {
    throw new Error("SEEDANCE_API_KEY not configured");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SEEDANCE_KEY}`,
  };
}

function buildAdPrompt(input: GenerateVideoInput): string {
  if (!input.adMode) return input.prompt;
  const brand = input.brand ? ` Brand: ${input.brand}.` : "";
  return `Vertical short-form ad.${brand} Hook in first second, strong CTA energy, cinematic. ${input.prompt}`.trim();
}

async function submit(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  const body: Record<string, unknown> = {
    model: input.model || DEFAULT_MODEL,
    prompt: buildAdPrompt(input),
    aspect_ratio: input.aspectRatio || "9:16",
    duration: input.durationSec || 6,
  };
  if (input.referenceImage) body.image = input.referenceImage;
  if (input.seed !== undefined) body.seed = input.seed;

  const res = await fetch(`${SEEDANCE_BASE}/video/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Seedance submit failed ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = (await res.json()) as { id?: string; task_id?: string; status?: string };
  const taskId = json.id || json.task_id;
  if (!taskId) throw new Error("Seedance submit error: no task id");
  return { provider: "seedance", taskId, status: "queued", model: body.model as string };
}

async function poll(taskId: string): Promise<GenerateVideoTask> {
  const res = await fetch(`${SEEDANCE_BASE}/video/status/${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Seedance poll failed ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    status?: string;
    progress?: number;
    output?: { video_url?: string; thumbnail_url?: string };
    error?: string;
  };
  const statusMap: Record<string, GenerateVideoTask["status"]> = {
    queued: "queued",
    starting: "queued",
    processing: "running",
    running: "running",
    succeeded: "succeeded",
    completed: "succeeded",
    failed: "failed",
    error: "failed",
    canceled: "failed",
  };
  const mapped = statusMap[(json.status || "").toLowerCase()] || "running";
  return {
    provider: "seedance",
    taskId,
    status: mapped,
    progress: json.progress,
    videoUrl: json.output?.video_url,
    thumbnailUrl: json.output?.thumbnail_url,
    error: mapped === "failed" ? json.error : undefined,
  };
}

export const seedanceAdapter: ProviderAdapter = { name: "seedance", submit, poll };
