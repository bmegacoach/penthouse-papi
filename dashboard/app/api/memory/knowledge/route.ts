import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeManager } from "@/lib/memory/server";

export async function GET(req: NextRequest) {
  const namespace = req.nextUrl.searchParams.get("namespace");
  const km = await getKnowledgeManager();

  if (namespace) {
    const entities = await km.list(namespace);
    return NextResponse.json({ namespace, entities });
  }

  const namespaces = await km.listNamespaces();
  const all: Record<string, { count: number }> = {};
  for (const ns of namespaces) {
    const entities = await km.list(ns);
    all[ns] = { count: entities.length };
  }

  return NextResponse.json({ namespaces: all });
}
