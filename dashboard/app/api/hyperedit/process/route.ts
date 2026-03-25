import { NextResponse } from "next/server";
import { processAllJobs } from "@/lib/hyperedit/worker";

export async function POST() {
  try {
    const processed = await processAllJobs();
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}
