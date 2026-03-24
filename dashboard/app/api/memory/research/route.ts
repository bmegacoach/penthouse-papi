import { NextRequest, NextResponse } from "next/server";
import { getResearchQueue } from "@/lib/memory/server";

export async function GET() {
  const queue = await getResearchQueue();
  const items = await queue.list();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { question, context, priority, namespace, source_hint } = body;

  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const queue = await getResearchQueue();
  const id = await queue.add({
    question,
    context: context || "",
    trigger: "manual",
    priority: priority || "p2",
    namespace: namespace || "content",
    source_hint,
  });

  return NextResponse.json({ id });
}
