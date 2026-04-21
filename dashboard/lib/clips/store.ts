import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { ClipAsset } from "./types";
import { listJobs } from "@/lib/hyperedit/jobs";

const STORE_PATH = join(process.cwd(), "memory", "state", "clips.json");

async function readStore(): Promise<ClipAsset[]> {
  try { return JSON.parse(await readFile(STORE_PATH, "utf-8")); } catch { return []; }
}

async function saveStore(items: ClipAsset[]): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

/** Extract clips from ready Hyperedit jobs that don't already have clips */
export async function syncClipsFromJobs(): Promise<ClipAsset[]> {
  const jobs = await listJobs();
  const existing = await readStore();
  const existingJobIds = new Set(existing.map(c => c.jobId));
  const newClips: ClipAsset[] = [];

  for (const job of jobs) {
    if (job.status !== "ready" || !job.clipPlan || existingJobIds.has(job.id)) continue;
    for (const plan of job.clipPlan) {
      newClips.push({
        id: randomUUID(),
        jobId: job.id,
        title: plan.title,
        hook: plan.hook,
        script: plan.script_outline,
        platform: plan.platform,
        duration: plan.estimated_duration,
        approved: plan.approved ?? false,
        notes: plan.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (newClips.length > 0) {
    const all = [...existing, ...newClips];
    await saveStore(all);
  }

  return [...existing, ...newClips];
}

export async function listClips(status?: string): Promise<ClipAsset[]> {
  const clips = await syncClipsFromJobs();
  if (status === "ready") return clips.filter(c => !c.approved);
  if (status === "approved") return clips.filter(c => c.approved);
  return clips;
}

export async function getClip(id: string): Promise<ClipAsset | null> {
  const clips = await readStore();
  return clips.find(c => c.id === id) || null;
}

export async function updateClip(id: string, updates: Partial<ClipAsset>): Promise<ClipAsset | null> {
  const clips = await readStore();
  const idx = clips.findIndex(c => c.id === id);
  if (idx === -1) return null;
  clips[idx] = { ...clips[idx], ...updates, updated_at: new Date().toISOString() };
  await saveStore(clips);
  return clips[idx];
}
