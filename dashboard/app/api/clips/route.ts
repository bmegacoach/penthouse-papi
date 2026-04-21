import { NextRequest, NextResponse } from "next/server";
import { listClips } from "@/lib/clips/store";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const clips = await listClips(status);
  return NextResponse.json({ clips });
}
