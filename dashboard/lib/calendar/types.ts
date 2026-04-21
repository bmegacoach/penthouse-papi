export interface CalendarEntry {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  time?: string;           // HH:MM (optional)
  platform: string;        // "tiktok" | "reels" | "shorts" | "linkedin" | "twitter"
  brand: string;
  contentType: "video" | "image" | "copy";
  status: "scheduled" | "published" | "missed";
  sourceJobId?: string;    // links to HypereditJob
  conceptId?: string;      // links to Concept
  compositionId?: string;  // links to Remotion composition
  notes?: string;
  created_at: string;
  updated_at: string;
}
