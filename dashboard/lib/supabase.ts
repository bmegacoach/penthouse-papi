import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let _client: SupabaseClient | null = null;

interface StoredSettings {
  supabase_url?: string;
  supabase_anon_key?: string;
}

async function loadSettingsCredentials(): Promise<{ url: string; key: string } | null> {
  try {
    const settingsPath = join(process.cwd(), "memory", "state", "settings.json");
    const raw = await readFile(settingsPath, "utf-8");
    const settings: StoredSettings = JSON.parse(raw);
    if (settings.supabase_url && settings.supabase_anon_key) {
      return { url: settings.supabase_url, key: settings.supabase_anon_key };
    }
  } catch {}
  return null;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (_client) return _client;

  // Priority 1: Environment variables
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Priority 2: Settings file
  if (!url || !key) {
    const fromSettings = await loadSettingsCredentials();
    if (fromSettings) {
      url = url || fromSettings.url;
      key = key || fromSettings.key;
    }
  }

  if (!url || !key) {
    return null; // No credentials available
  }

  _client = createClient(url, key);
  return _client;
}

// Browser-side client (uses NEXT_PUBLIC_ env vars only, no file system access)
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Reset client (useful when settings change)
export function resetSupabaseClient(): void {
  _client = null;
}
