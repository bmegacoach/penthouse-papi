export type VideoProvider = "minimax" | "seedance";

export interface GenerateVideoInput {
  provider: VideoProvider;
  prompt: string;
  model?: string;
  referenceImage?: string;
  durationSec?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  adMode?: boolean;
  brand?: string;
  seed?: number;
}

export interface GenerateVideoTask {
  provider: VideoProvider;
  taskId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  model?: string;
}

export interface ProviderAdapter {
  name: VideoProvider;
  submit(input: GenerateVideoInput): Promise<GenerateVideoTask>;
  poll(taskId: string): Promise<GenerateVideoTask>;
}
