import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/hyperedit/jobs";
import { processNextJob } from "@/lib/hyperedit/worker";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Reset to queued so the worker picks it up again
  await updateJob(id, {
    status: "queued",
    progress: 0,
    clips: 0,
    clipPlan: undefined,
    contentSummary: undefined,
    brandAlignment: undefined,
    error: undefined,
  });

  return NextResponse.json({ ok: true, message: "Job re-queued for processing" });
}
