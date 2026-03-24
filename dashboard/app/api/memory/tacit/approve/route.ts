import { NextRequest, NextResponse } from "next/server";
import { getTacitManager } from "@/lib/memory/server";

export async function POST(req: NextRequest) {
  const { slug, content, confidence } = await req.json();
  if (!slug || !content) {
    return NextResponse.json({ error: "slug and content required" }, { status: 400 });
  }

  const tm = await getTacitManager();
  await tm.write(slug, content, confidence || 1, true);
  return NextResponse.json({ ok: true });
}
