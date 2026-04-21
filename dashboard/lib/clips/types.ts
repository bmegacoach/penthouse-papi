export interface ClipAsset {
  id: string;
  jobId: string;
  conceptId?: string;
  title: string;
  hook: string;
  script: string;
  platform: string;
  duration: string;
  remotionProps?: Record<string, unknown>;
  approved: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}
