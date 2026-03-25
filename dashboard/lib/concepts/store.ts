import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { Concept } from "./types";

const STORE_PATH = join(process.cwd(), "memory", "state", "concepts.json");

async function readStore(): Promise<Concept[]> {
  try { return JSON.parse(await readFile(STORE_PATH, "utf-8")); } catch { return []; }
}

async function saveStore(items: Concept[]): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function listConcepts(brand?: string, status?: string): Promise<Concept[]> {
  let items = await readStore();
  if (brand && brand !== "all") items = items.filter(c => c.brand.toLowerCase().includes(brand));
  if (status) items = items.filter(c => c.status === status);
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createConcept(input: Omit<Concept, "id" | "created_at" | "updated_at">): Promise<Concept> {
  const items = await readStore();
  const concept: Concept = { ...input, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  items.push(concept);
  await saveStore(items);
  return concept;
}

export async function updateConcept(id: string, updates: Partial<Concept>): Promise<Concept | null> {
  const items = await readStore();
  const idx = items.findIndex(c => c.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
  await saveStore(items);
  return items[idx];
}

export async function deleteConcept(id: string): Promise<boolean> {
  const items = await readStore();
  const idx = items.findIndex(c => c.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  await saveStore(items);
  return true;
}
