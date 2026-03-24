import { NextResponse } from "next/server";
import { getEventLogger, getResearchQueue } from "@/lib/memory/server";
import { listJobs } from "@/lib/hyperedit/jobs";

export async function GET() {
  try {
    const el = await getEventLogger();
    const rq = await getResearchQueue();

    const todayEvents = await el.readToday();
    const researchItems = await rq.list();
    let hypeditJobs: any[] = [];
    try { hypeditJobs = await listJobs(); } catch {}

    // Count stats
    const completedToday = todayEvents.filter(e => e.type === "task_complete").length;
    const inQueue = researchItems.filter(i => i.status === "queued").length +
                    hypeditJobs.filter(j => j.status === "queued").length;
    const rendering = hypeditJobs.filter(j => ["planning", "transcribing", "rendering"].includes(j.status)).length;
    const approved = hypeditJobs.filter(j => j.status === "ready").length;

    // Calendar data for next 7 days (from hyperedit jobs by date)
    const calendar: { date: string; video: number; image: number; copy: number }[] = [];
    for (let i = -1; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayJobs = hypeditJobs.filter(j => j.created_at?.startsWith(dateStr));
      calendar.push({
        date: dateStr,
        video: dayJobs.length,
        image: 0,
        copy: 0,
      });
    }

    return NextResponse.json({
      completed_today: completedToday,
      in_queue: inQueue,
      rendering,
      approved,
      calendar,
      research_active: researchItems.filter(i => i.status === "active").length,
      research_queued: researchItems.filter(i => i.status === "queued").length,
    });
  } catch (err) {
    return NextResponse.json({
      completed_today: 0,
      in_queue: 0,
      rendering: 0,
      approved: 0,
      calendar: [],
      research_active: 0,
      research_queued: 0,
    });
  }
}
