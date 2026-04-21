import { NextResponse } from "next/server";
import { getResearchQueue } from "@/lib/memory/server";
import { listConcepts } from "@/lib/concepts/store";

export async function GET() {
  try {
    const rq = await getResearchQueue();
    const items = await rq.list();
    const concepts = await listConcepts();

    // Find completed research items that don't already have linked concepts
    const linkedResearchIds = new Set(
      concepts.filter(c => c.researchItemId).map(c => c.researchItemId)
    );

    const suggestions = items
      .filter(item => item.status === "complete" && item.result && !linkedResearchIds.has(item.id))
      .map(item => ({
        id: item.id,
        question: item.question,
        summary: item.result!.summary,
        sources: item.result!.sources.length,
        priority: item.priority,
        completed_at: item.completed_at,
        suggestedTitle: item.question.length > 80 ? item.question.slice(0, 77) + "..." : item.question,
        suggestedTags: ["research_driven", item.namespace],
      }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
