import type { GenerateVideoInput, GenerateVideoTask, ProviderAdapter } from "./types";

const SEEDANCE_BASE = process.env.SEEDANCE_API_BASE || "https://seedanceapi.org";
const SEEDANCE_KEY = process.env.SEEDANCE_API_KEY || "";
const DEFAULT_MODEL = process.env.SEEDANCE_MODEL || "seedance-2.0";

function authHeaders() {
  if (!SEEDANCE_KEY) throw new Error("SEEDANCE_API_KEY not configured");
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

function snapDuration(seconds?: number): 5 | 10 | 15 {
  const s = Number(seconds) || 5;
  if (s >= 13) return 15;
  if (s >= 8) return 10;
  return 5;
}

function snapAspect(ratio?: string): "16:9" | "9:16" | "4:3" | "3:4" {
  const allowed = ["16:9", "9:16", "4:3", "3:4"] as const;
  return (allowed as readonly string[]).includes(ratio || "") ? (ratio as typeof allowed[number]) : "9:16";
}

async function submit(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  const body: Record<string, unknown> = {
    model: input.model || DEFAULT_MODEL,
    prompt: buildAdPrompt(input).slice(0, 2000),
    aspect_ratio: snapAspect(input.aspectRatio),
    duration: snapDuration(input.durationSec),
  };
  if (input.referenceImage) body.images = [input.referenceImage];

  const res = await fetch(`${SEEDANCE_BASE}/v2/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
    data?: { task_id?: string };
    task_id?: string;
  };
  if (!res.ok || (json.code && json.code >= 400)) {
    throw new Error(`Seedance submit ${res.status}: ${json.message || "error"}`);
  }
  const taskId = json.data?.task_id || json.task_id;
  if (!taskId) throw new Error("Seedance submit error: no task_id in response");
  return { provider: "seedance", taskId, status: "queued", model: body.model as string };
}

async function poll(taskId: string): Promise<GenerateVideoTask> {
  const res = await fetch(`${SEEDANCE_BASE}/v2/status?task_id=${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
    data?: {
      task_id?: string;
      status?: string;
      consumed_credits?: number;
      response?: string[];
      error?: string;
    };
  };
  if (!res.ok && !json.data) {
    throw new Error(`Seedance poll ${res.status}: ${json.message || "error"}`);
  }
  const statusMap: Record<string, GenerateVideoTask["status"]> = {
    PENDING: "queued",
    QUEUED: "queued",
    PROCESSING: "running",
    RUNNING: "running",
    SUCCESS: "succeeded",
    SUCCEEDED: "succeeded",
    COMPLETED: "succeeded",
    FAILED: "failed",
    ERROR: "failed",
    CANCELED: "failed",
  };
  const rawStatus = (json.data?.status || "").toUpperCase();
  const mapped = statusMap[rawStatus] || "running";
  const videoUrl = json.data?.response && json.data.response.length > 0 ? json.data.response[0] : undefined;
  return {
    provider: "seedance",
    taskId,
    status: mapped,
    videoUrl,
    error: mapped === "failed" ? json.data?.error || json.message : undefined,
  };
}

export const seedanceAdapter: ProviderAdapter = { name: "seedance", submit, poll };
