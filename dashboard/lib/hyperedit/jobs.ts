import { randomUUID } from "node:crypto";
import type { HypereditJob } from "./types";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const JOBS_PATH = join(process.cwd(), "memory", "state", "hyperedit-jobs.json");

async function readJobs(): Promise<HypereditJob[]> {
  try {
    const raw = await readFile(JOBS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveJobs(jobs: HypereditJob[]): Promise<void> {
  await mkdir(dirname(JOBS_PATH), { recursive: true });
  await writeFile(JOBS_PATH, JSON.stringify(jobs, null, 2), "utf-8");
}

export async function listJobs(): Promise<HypereditJob[]> {
  return readJobs();
}

import type { AiVideoMeta } from "./types";

export async function createJob(input: {
  name: string;
  source: "file" | "url" | "ai";
  sourcePath: string;
  brand: string;
  platforms: string[];
  maxClips: number;
  conceptId?: string;
  aiVideo?: AiVideoMeta;
}): Promise<HypereditJob> {
  const jobs = await readJobs();
  const job: HypereditJob = {
    id: randomUUID(),
    ...input,
    status: input.source === "ai" ? "generating" : "queued",
    progress: 0,
    clips: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  jobs.push(job);
  await saveJobs(jobs);
  return job;
}

export async function getJob(id: string): Promise<HypereditJob | null> {
  const jobs = await readJobs();
  return jobs.find(j => j.id === id) || null;
}

export async function updateJob(id: string, updates: Partial<HypereditJob>): Promise<HypereditJob | null> {
  const jobs = await readJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...updates, updated_at: new Date().toISOString() };
  await saveJobs(jobs);
  return jobs[idx];
}
