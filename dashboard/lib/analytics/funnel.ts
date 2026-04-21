import { listConcepts } from "@/lib/concepts/store";
import { listJobs } from "@/lib/hyperedit/jobs";
import { listClips } from "@/lib/clips/store";
import { listEntries } from "@/lib/calendar/store";

export interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

export interface FunnelData {
  stages: FunnelStage[];
  conversionRates: { from: string; to: string; rate: number }[];
}

export async function getFunnelData(): Promise<FunnelData> {
  const [concepts, jobs, clips, entries] = await Promise.all([
    listConcepts(),
    listJobs(),
    listClips(),
    listEntries(),
  ]);

  const published = entries.filter(e => e.status === "published").length;

  const stages: FunnelStage[] = [
    { stage: "Concepts", count: concepts.length, color: "#6C63FF" },
    { stage: "Jobs", count: jobs.length, color: "#F59E0B" },
    { stage: "Clips", count: clips.length, color: "#22C55E" },
    { stage: "Scheduled", count: entries.length, color: "#3B82F6" },
    { stage: "Published", count: published, color: "#FFD700" },
  ];

  const conversionRates = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    conversionRates.push({
      from: from.stage,
      to: to.stage,
      rate: from.count > 0 ? Math.round((to.count / from.count) * 100) : 0,
    });
  }

  return { stages, conversionRates };
}
