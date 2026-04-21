import { NextRequest, NextResponse } from "next/server";
import { listEntries, createEntry } from "@/lib/calendar/store";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || undefined;
  const brand = req.nextUrl.searchParams.get("brand") || undefined;
  const entries = await listEntries(month, brand);
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.date || !body.platform || !body.brand || !body.contentType) {
      return NextResponse.json({ error: "title, date, platform, brand, contentType required" }, { status: 400 });
    }
    const entry = await createEntry({
      title: body.title,
      date: body.date,
      time: body.time,
      platform: body.platform,
      brand: body.brand,
      contentType: body.contentType,
      status: body.status || "scheduled",
      sourceJobId: body.sourceJobId,
      conceptId: body.conceptId,
      compositionId: body.compositionId,
      notes: body.notes,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
