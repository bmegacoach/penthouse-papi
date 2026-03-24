import { NextRequest, NextResponse } from "next/server";
import { getDailyWriter, getEventLogger } from "@/lib/memory/server";

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  const dw = await getDailyWriter();
  const el = await getEventLogger();

  const [notes, events] = await Promise.all([
    dw.readDate(date),
    el.readDate(date),
  ]);

  return NextResponse.json({ date: date.toISOString().split("T")[0], notes, events });
}
