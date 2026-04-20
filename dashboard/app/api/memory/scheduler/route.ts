import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, getSchedulerState, triggerJob } from "@/lib/memory/scheduler";

export async function GET() {
  return NextResponse.json(getSchedulerState());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, job } = body;

  switch (action) {
    case "start":
      startScheduler();
      return NextResponse.json({ ok: true, message: "Scheduler started" });

    case "stop":
      stopScheduler();
      return NextResponse.json({ ok: true, message: "Scheduler stopped" });

    case "trigger":
      if (!job || !["heartbeat", "autoresearch", "consolidation"].includes(job)) {
        return NextResponse.json({ error: "Invalid job name" }, { status: 400 });
      }
      await triggerJob(job);
      return NextResponse.json({ ok: true, message: `Triggered ${job}` });

    default:
      return NextResponse.json({ error: "Invalid action. Use: start, stop, trigger" }, { status: 400 });
  }
}
