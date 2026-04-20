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

export interface HypereditJob {
  id: string;
  name: string;
  source: "file" | "url";
  sourcePath: string;
  brand: string;
  platforms: string[];
  maxClips: number;
  status: "queued" | "planning" | "transcribing" | "rendering" | "ready" | "failed";
  progress: number;
  clips: number;
  clipPlan?: ClipPlan[];
  contentSummary?: string;
  brandAlignment?: string;
  conceptId?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}
