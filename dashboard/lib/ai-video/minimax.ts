import type { GenerateVideoInput, GenerateVideoTask, ProviderAdapter } from "./types";

const MINIMAX_BASE = process.env.MINIMAX_API_BASE || "https://api.minimaxi.chat/v1";
const MINIMAX_KEY = process.env.MINIMAX_API_KEY || "";
const DEFAULT_MODEL = process.env.MINIMAX_MODEL || "video-01";

function authHeaders() {
  if (!MINIMAX_KEY) {
    throw new Error("MINIMAX_API_KEY not configured");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${MINIMAX_KEY}`,
  };
}

function buildAdPrompt(input: GenerateVideoInput): string {
  if (!input.adMode) return input.prompt;
  const brandTag = input.brand ? ` for ${input.brand}` : "";
  return [
    `High-converting vertical social ad${brandTag}.`,
    `Hook opens in first second. Dynamic camera, cinematic lighting, punchy pacing.`,
    `Creative direction: ${input.prompt}`,
    input.aspectRatio === "9:16" || !input.aspectRatio ? "Aspect 9:16 vertical." : "",
  ].filter(Boolean).join(" ");
}

async function submit(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  const body: Record<string, unknown> = {
    model: input.model || DEFAULT_MODEL,
    prompt: buildAdPrompt(input),
  };
  if (input.referenceImage) body.first_frame_image = input.referenceImage;

  const res = await fetch(`${MINIMAX_BASE}/video_generation`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MiniMax submit failed ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    task_id?: string;
    base_resp?: { status_code: number; status_msg: string };
  };
  if (!json.task_id) {
    const msg = json.base_resp?.status_msg || "no task_id in response";
    throw new Error(`MiniMax submit error: ${msg}`);
  }
  return { provider: "minimax", taskId: json.task_id, status: "queued", model: body.model as string };
}

async function poll(taskId: string): Promise<GenerateVideoTask> {
  const res = await fetch(`${MINIMAX_BASE}/query/video_generation?task_id=${encodeURIComponent(taskId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MiniMax poll failed ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    status?: string;
    file_id?: string;
    video_url?: string;
    base_resp?: { status_code: number; status_msg: string };
  };
  const statusMap: Record<string, GenerateVideoTask["status"]> = {
    Queueing: "queued",
    Preparing: "running",
    Processing: "running",
    Success: "succeeded",
    Fail: "failed",
  };
  const mapped = statusMap[json.status || ""] || "running";
  return {
    provider: "minimax",
    taskId,
    status: mapped,
    videoUrl: json.video_url,
    error: mapped === "failed" ? json.base_resp?.status_msg : undefined,
  };
}

export const minimaxAdapter: ProviderAdapter = { name: "minimax", submit, poll };
