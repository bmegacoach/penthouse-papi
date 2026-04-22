import { spawn } from "node:child_process";
import type { GenerateVideoInput, GenerateVideoTask, VideoProvider } from "./types";

/**
 * MiniMax `mmx` CLI adapter.
 *
 * The real CLI only targets MiniMax — it has no --provider flag and can't
 * call Seedance. The dispatcher in client.ts accounts for this by using
 * the CLI path only when the provider is "minimax".
 *
 * Install:   npm install -g mmx-cli
 * Auth:      mmx auth login --api-key <token-plan-key>
 * Video gen: requires Max Token Plan tier or above.
 */

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
      const out = stdout.trim();
      if (code === 0) return resolve(out);
      // mmx prints structured JSON errors to stdout even on non-zero exit
      try {
        const parsed = JSON.parse(out);
        if (parsed?.error?.message) {
          return reject(new Error(`mmx: ${parsed.error.message}`));
        }
      } catch {
        // fall through
      }
      reject(new Error(`mmx exited ${code}: ${stderr.trim() || out}`));
    });
  });
}

function parseJson<T>(out: string): T {
  try {
    return JSON.parse(out) as T;
  } catch {
    throw new Error(`mmx returned non-JSON output: ${out.slice(0, 200)}`);
  }
}

export async function cliSubmit(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  if (input.provider !== "minimax") {
    throw new Error(`mmx CLI only supports provider 'minimax'; got '${input.provider}'`);
  }
  const args = [
    "--output", "json",
    "--quiet",
    "video", "generate",
    "--prompt", input.prompt,
    "--async",
  ];
  if (input.model) args.push("--model", input.model);
  if (input.referenceImage) args.push("--first-frame", input.referenceImage);

  const out = await runCli(args);
  const raw = parseJson<{ task_id?: string; model?: string; status?: string }>(out);
  if (!raw.task_id) throw new Error(`mmx submit: missing task_id in response`);
  return {
    provider: "minimax",
    taskId: raw.task_id,
    status: (raw.status as GenerateVideoTask["status"]) || "queued",
    model: raw.model,
  };
}

export async function cliPoll(provider: VideoProvider, taskId: string): Promise<GenerateVideoTask> {
  if (provider !== "minimax") {
    throw new Error(`mmx CLI only supports provider 'minimax'; got '${provider}'`);
  }
  const out = await runCli(
    ["--output", "json", "--quiet", "video", "task", "get", "--task-id", taskId],
    30_000,
  );
  const raw = parseJson<{
    task_id?: string;
    status?: string;
    file_id?: string;
    video_url?: string;
    download_url?: string;
    error_message?: string;
    model?: string;
  }>(out);
  const statusMap: Record<string, GenerateVideoTask["status"]> = {
    Queueing: "queued",
    Preparing: "running",
    Processing: "running",
    Success: "succeeded",
    Fail: "failed",
  };
  const mapped = statusMap[raw.status || ""] || "running";
  return {
    provider: "minimax",
    taskId,
    status: mapped,
    videoUrl: raw.video_url || raw.download_url,
    error: mapped === "failed" ? raw.error_message : undefined,
    model: raw.model,
  };
}

export function cliEnabledFor(provider: VideoProvider): boolean {
  if (provider !== "minimax") return false;
  return Boolean(process.env.MMX_CLI_PATH) || process.env.MMX_CLI_ENABLED === "1";
}

/** @deprecated use cliEnabledFor(provider) — kept for back-compat */
export function cliEnabled(): boolean {
  return Boolean(process.env.MMX_CLI_PATH) || process.env.MMX_CLI_ENABLED === "1";
}
