import { getFunnelData } from "./funnel";
import { listEntries } from "@/lib/calendar/store";
import { listConcepts } from "@/lib/concepts/store";
import { getDailyWriter } from "@/lib/memory/server";

export async function generateAnalyticsDigest(): Promise<string> {
  const funnel = await getFunnelData();
  const entries = await listEntries();
  const concepts = await listConcepts();

  // Brand breakdown
  const brandCounts: Record<string, number> = {};
  for (const e of entries) {
    brandCounts[e.brand] = (brandCounts[e.brand] || 0) + 1;
  }

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  for (const e of entries) {
    platformCounts[e.platform] = (platformCounts[e.platform] || 0) + 1;
  }

  const topBrand = Object.entries(brandCounts).sort(([, a], [, b]) => b - a)[0];
  const topPlatform = Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0];

  const digest = [
    `## Analytics Digest - ${new Date().toISOString().split("T")[0]}`,
    "",
    "### Pipeline Funnel",
    ...funnel.stages.map(s => `- ${s.stage}: ${s.count}`),
    "",
    "### Conversion Rates",
    ...funnel.conversionRates.map(c => `- ${c.from} -> ${c.to}: ${c.rate}%`),
    "",
    "### Brand Distribution",
    ...Object.entries(brandCounts).map(([b, c]) => `- ${b}: ${c} entries`),
    topBrand ? `- **Top brand:** ${topBrand[0]} (${topBrand[1]} entries)` : "",
    "",
    "### Platform Distribution",
    ...Object.entries(platformCounts).map(([p, c]) => `- ${p}: ${c} entries`),
    topPlatform ? `- **Top platform:** ${topPlatform[0]} (${topPlatform[1]} entries)` : "",
    "",
    `### Summary`,
    `- ${concepts.length} total concepts (${concepts.filter(c => c.status === "approved").length} approved)`,
    `- ${entries.length} calendar entries (${entries.filter(e => e.status === "published").length} published)`,
  ].join("\n");

  // Write to Memory L1
  try {
    const dw = await getDailyWriter();
    await dw.append(digest, "analytics_digest");
  } catch { /* memory unavailable */ }

  return digest;
}
