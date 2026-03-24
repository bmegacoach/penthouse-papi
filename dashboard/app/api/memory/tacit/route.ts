import { NextResponse } from "next/server";
import { getTacitManager } from "@/lib/memory/server";

export async function GET() {
  const tm = await getTacitManager();
  const rules = await tm.list();
  return NextResponse.json({ rules });
}
