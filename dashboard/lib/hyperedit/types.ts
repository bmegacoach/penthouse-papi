export interface HypereditJob {
  id: string;
  name: string;
  source: "file" | "url";
  sourcePath: string;        // local file path or URL
  brand: string;
  platforms: string[];
  maxClips: number;
  status: "queued" | "planning" | "transcribing" | "rendering" | "ready" | "failed";
  progress: number;          // 0-100
  clips: number;
  error?: string;
  created_at: string;
  updated_at: string;
}
