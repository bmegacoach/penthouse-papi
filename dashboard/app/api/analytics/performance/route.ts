import { NextRequest, NextResponse } from "next/server";
import { listEntries } from "@/lib/calendar/store";
import { listConcepts } from "@/lib/concepts/store";
import { listJobs } from "@/lib/hyperedit/jobs";
import { generateAnalyticsDigest } from "@/lib/analytics/digest";

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand") || undefined;
  const triggerDigest = req.nextUrl.searchParams.get("digest") === "true";

  const [entries, concepts, jobs] = await Promise.all([
    listEntries(undefined, brand),
    listConcepts(brand),
    listJobs(),
  ]);

  const brandJobs = brand
    ? jobs.filter(j => j.brand.toLowerCase().includes(brand.toLowerCase()))
    : jobs;

  // Content type breakdown
  const byType = { video: 0, image: 0, copy: 0 };
  for (const e of entries) {
    if (e.contentType in byType) byType[e.contentType as keyof typeof byType]++;
  }

  // Platform breakdown
  const byPlatform: Record<string, number> = {};
  for (const e of entries) {
    byPlatform[e.platform] = (byPlatform[e.platform] || 0) + 1;
  }

  // Status breakdown
  const byStatus = {
    scheduled: entries.filter(e => e.status === "scheduled").length,
    published: entries.filter(e => e.status === "published").length,
    missed: entries.filter(e => e.status === "missed").length,
  };

  let digest: string | undefined;
  if (triggerDigest) {
    digest = await generateAnalyticsDigest();
  }

  return NextResponse.json({
    totalConcepts: concepts.length,
    totalJobs: brandJobs.length,
    totalEntries: entries.length,
    byType,
    byPlatform,
    byStatus,
    conceptsByStatus: {
      draft: concepts.filter(c => c.status === "draft").length,
      review: concepts.filter(c => c.status === "review").length,
      approved: concepts.filter(c => c.status === "approved").length,
      published: concepts.filter(c => c.status === "published").length,
    },
    digest,
  });
}
