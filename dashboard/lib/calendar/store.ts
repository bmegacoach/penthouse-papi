import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { CalendarEntry } from "./types";

const STORE_PATH = join(process.cwd(), "memory", "state", "calendar-entries.json");

async function readStore(): Promise<CalendarEntry[]> {
  try { return JSON.parse(await readFile(STORE_PATH, "utf-8")); } catch { return []; }
}

async function saveStore(items: CalendarEntry[]): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function listEntries(month?: string, brand?: string): Promise<CalendarEntry[]> {
  let items = await readStore();
  if (month) items = items.filter(e => e.date.startsWith(month));
  if (brand && brand !== "all") items = items.filter(e => e.brand.toLowerCase().includes(brand.toLowerCase()));
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
}

export async function createEntry(input: Omit<CalendarEntry, "id" | "created_at" | "updated_at">): Promise<CalendarEntry> {
  const items = await readStore();
  const entry: CalendarEntry = { ...input, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  items.push(entry);
  await saveStore(items);
  return entry;
}

export async function updateEntry(id: string, updates: Partial<CalendarEntry>): Promise<CalendarEntry | null> {
  const items = await readStore();
  const idx = items.findIndex(e => e.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
  await saveStore(items);
  return items[idx];
}

export async function deleteEntry(id: string): Promise<boolean> {
  const items = await readStore();
  const idx = items.findIndex(e => e.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  await saveStore(items);
  return true;
}

export async function getEntriesByDate(date: string): Promise<CalendarEntry[]> {
  const items = await readStore();
  return items.filter(e => e.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}
