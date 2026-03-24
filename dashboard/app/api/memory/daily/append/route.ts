import { NextRequest, NextResponse } from "next/server";
import { getDailyWriter, getEventLogger } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, source, tags, eventType, payload } = body;

  if (!content || !source) {
    return NextResponse.json({ error: "content and source required" }, { status: 400 });
  }

  const dw = await getDailyWriter();
  await dw.append(content, source, tags);

  if (eventType) {
    const el = await getEventLogger();
    await el.log({ type: eventType, source, layer: "L1", payload: payload || {}, tags });
  }

  return NextResponse.json({ ok: true });
}
