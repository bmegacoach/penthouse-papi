import { NextResponse } from "next/server";
import { getFunnelData } from "@/lib/analytics/funnel";

export async function GET() {
  const data = await getFunnelData();
  return NextResponse.json(data);
}
