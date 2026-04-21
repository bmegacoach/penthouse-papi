// ── Memory Event Types ──────────────────────────────────────────────
export type EventType =
  | "task_start" | "task_complete" | "task_fail"
  | "decision" | "research_start" | "research_complete"
  | "blocker" | "deploy" | "error"
  | "tacit_proposal" | "needs_research" | "manual_note";

export interface MemoryEvent {
  timestamp: string;
  type: EventType;
  source: string;
  layer: "L1" | "L2" | "L3";
  namespace?: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

// ── Research ────────────────────────────────────────────────────────
export type ResearchTrigger = "tag" | "blocker" | "missing" | "scheduled" | "manual";
export type ResearchStatus = "queued" | "active" | "complete" | "failed" | "dead";
export type ResearchSource = "perplexity" | "youtube" | "reddit" | "ahrefs";

export interface ResearchItem {
  id: string;
  question: string;
  context: string;
  trigger: ResearchTrigger;
  source_hint?: ResearchSource[];
  priority: "p1" | "p2" | "p3";
  namespace: string;
  status: ResearchStatus;
  retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: {
    summary: string;
    sources: { url: string; title: string; relevance: string }[];
    knowledge_updates: string[];
    tacit_proposals: string[];
    partial: boolean;
  };
}

// ── Config ──────────────────────────────────────────────────────────
export type MemoryTier = "business-unit" | "chiefos" | "product";

export interface MemoryConfig {
  tier: MemoryTier;
  namespace: string;
  rootPath: string;
  sync: {
    enabled: boolean;
    upstream: string;
    sharedNamespaces: string[];
    ownedNamespaces: string[];
  };
  autoresearch: {
    sources: ResearchSource[];
    schedule: string;
    maxConcurrent: number;
  };
  consolidation: {
    schedule: string;
  };
}

// ── State files ─────────────────────────────────────────────────────
export interface HeartbeatState {
  last_run: string;
  stalled_tasks: { event_id: string; description: string; stalled_since: string }[];
  repeated_blockers: { pattern: string; count: number; research_created: boolean }[];
  research_queue_health: { queued: number; active: number; failed: number; dead: number };
}

export interface SyncFileState {
  path: string;
  checksum: string;
  updated_at: string;
  owner: "chiefos" | "business-unit";
  last_synced: string;
}

export interface ConsolidationState {
  last_run: string;
  files_updated: string[];
  patterns_found: string[];
  tacit_proposals: string[];
  manifest: { path: string; type: "L2" | "L3"; namespace: string }[];
}

// ── Internal ────────────────────────────────────────────────────────
export interface KnowledgeEntity {
  path: string;
  namespace: string;
  title: string;
  content: string;
  updated_at: string;
  source: "consolidation" | "autoresearch" | "manual" | "seed";
}

export interface TacitRule {
  path: string;
  title: string;
  content: string;
  confidence: number;
  origin_daily_note?: string;
  updated_at: string;
}

export interface WriteRequest {
  path: string;
  content: string;
  mode: "append" | "overwrite";
  resolve: () => void;
  reject: (err: Error) => void;
}
