export interface ClipPlan {
  title: string;
  hook: string;
  description: string;
  platform: string;
  estimated_duration: string;
  script_outline: string;
  notes?: string;        // operator notes/edits
  approved?: boolean;    // operator approval
}

export type AiVideoProvider = "minimax" | "seedance";

export interface AiVideoMeta {
  provider: AiVideoProvider;
  model?: string;
  prompt: string;
  referenceImage?: string;
  durationSec?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  taskId?: string;
  adMode?: boolean;
}

export interface HypereditJob {
  id: string;
  name: string;
  source: "file" | "url" | "ai";
  sourcePath: string;
  brand: string;
  platforms: string[];
  maxClips: number;
  status: "queued" | "planning" | "generating" | "transcribing" | "rendering" | "ready" | "failed";
  progress: number;
  clips: number;
  clipPlan?: ClipPlan[];
  contentSummary?: string;
  brandAlignment?: string;
  conceptId?: string;
  aiVideo?: AiVideoMeta;
  error?: string;
  created_at: string;
  updated_at: string;
}
