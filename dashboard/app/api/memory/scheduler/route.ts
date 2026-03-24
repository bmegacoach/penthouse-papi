import { NextRequest, NextResponse } from "next/server";
import { getSchedulerState, startScheduler, stopScheduler, runJobNow } from "@/lib/memory/scheduler";

export async function GET() {
  return NextResponse.json(getSchedulerState());
}

export async function POST(req: NextRequest) {
  const { action, job } = await req.json();

  switch (action) {
    case "start":
      await startScheduler();
      return NextResponse.json({ ok: true, message: "Scheduler started" });
    case "stop":
      stopScheduler();
      return NextResponse.json({ ok: true, message: "Scheduler stopped" });
    case "run":
      if (!job) return NextResponse.json({ error: "job name required" }, { status: 400 });
      try {
        await runJobNow(job);
        return NextResponse.json({ ok: true, message: `${job} completed` });
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
      }
    default:
      return NextResponse.json({ error: "Unknown action. Use: start, stop, run" }, { status: 400 });
  }
}
