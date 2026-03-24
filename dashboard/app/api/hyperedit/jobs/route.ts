import { NextRequest, NextResponse } from "next/server";
import { listJobs, createJob } from "@/lib/hyperedit/jobs";

export async function GET() {
  const jobs = await listJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, source, sourcePath, brand, platforms, maxClips } = body;

  if (!name || !sourcePath) {
    return NextResponse.json({ error: "name and sourcePath required" }, { status: 400 });
  }

  const job = await createJob({
    name: name || sourcePath.split("/").pop() || "Untitled",
    source: source || "file",
    sourcePath,
    brand: brand || "GBB",
    platforms: platforms || ["reels", "shorts"],
    maxClips: maxClips || 5,
  });

  return NextResponse.json({ job });
}
