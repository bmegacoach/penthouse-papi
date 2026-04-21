import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryConfig } from "./types";

const DEFAULT_CONFIG: MemoryConfig = {
  tier: "business-unit",
  namespace: "penthouse-papi",
  rootPath: "./memory",
  sync: {
    enabled: true,
    upstream: "../../memory",
    sharedNamespaces: ["fleet", "infrastructure"],
    ownedNamespaces: ["content", "brands", "campaigns", "market-intel"],
  },
  autoresearch: {
    sources: ["perplexity", "youtube", "reddit", "ahrefs"],
    schedule: "0 */4 * * *",
    maxConcurrent: 2,
  },
  consolidation: {
    schedule: "0 2 * * *",
  },
};

export async function loadConfig(basePath?: string): Promise<MemoryConfig> {
  const root = basePath || process.cwd();
  const configPath = join(root, "memory", "config.json");

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MemoryConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      sync: { ...DEFAULT_CONFIG.sync, ...(parsed.sync || {}) },
      autoresearch: { ...DEFAULT_CONFIG.autoresearch, ...(parsed.autoresearch || {}) },
      consolidation: { ...DEFAULT_CONFIG.consolidation, ...(parsed.consolidation || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function resolveMemoryPath(config: MemoryConfig, ...segments: string[]): string {
  return join(config.rootPath, ...segments);
}
