import { spawn } from "node:child_process";
import type { GenerateVideoInput, GenerateVideoTask, VideoProvider } from "./types";

const DEFAULT_CLI = process.env.MMX_CLI_PATH || "mmx";
const CLI_TIMEOUT_MS = Number(process.env.MMX_CLI_TIMEOUT_MS || 120_000);

function runCli(args: string[], timeoutMs = CLI_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(DEFAULT_CLI, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`mmx CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(stdout.trim());
      reject(new Error(`mmx exited ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

function parseJson<T>(out: string): T {
  try {
    return JSON.parse(out) as T;
  } catch (err) {
    throw new Error(`mmx returned non-JSON output: ${out.slice(0, 200)}`);
  }
}

export async function cliSubmit(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  const args = [
    "video", "generate",
    "--provider", input.provider,
    "--prompt", input.prompt,
    "--aspect", input.aspectRatio || "9:16",
    "--duration", String(input.durationSec || 6),
    "--json",
  ];
  if (input.model) args.push("--model", input.model);
  if (input.referenceImage) args.push("--image", input.referenceImage);
  if (input.seed !== undefined) args.push("--seed", String(input.seed));
  if (input.adMode) args.push("--preset", "ad");

  const out = await runCli(args);
  const raw = parseJson<{ task_id: string; status?: string; model?: string }>(out);
  return {
    provider: input.provider,
    taskId: raw.task_id,
    status: (raw.status as GenerateVideoTask["status"]) || "queued",
    model: raw.model,
  };
}

export async function cliPoll(provider: VideoProvider, taskId: string): Promise<GenerateVideoTask> {
  const out = await runCli(["video", "status", "--provider", provider, "--task", taskId, "--json"], 30_000);
  const raw = parseJson<{
    task_id: string;
    status: GenerateVideoTask["status"];
    progress?: number;
    video_url?: string;
    thumbnail_url?: string;
    error?: string;
    model?: string;
  }>(out);
  return {
    provider,
    taskId: raw.task_id,
    status: raw.status,
    progress: raw.progress,
    videoUrl: raw.video_url,
    thumbnailUrl: raw.thumbnail_url,
    error: raw.error,
    model: raw.model,
  };
}

export function cliEnabled(): boolean {
  return Boolean(process.env.MMX_CLI_PATH) || process.env.MMX_CLI_ENABLED === "1";
}
