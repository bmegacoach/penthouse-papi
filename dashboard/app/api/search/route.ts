import { NextRequest, NextResponse } from "next/server";
import { getRetriever } from "@/lib/memory/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q parameter required" }, { status: 400 });

  const retriever = await getRetriever();
  const results = await retriever.search(q);
  return NextResponse.json(results);
}
