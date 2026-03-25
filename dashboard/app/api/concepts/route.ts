import { NextRequest, NextResponse } from "next/server";
import { listConcepts, createConcept } from "@/lib/concepts/store";

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const concepts = await listConcepts(brand, status);
  return NextResponse.json({ concepts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, brand, status, tags } = body;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const concept = await createConcept({
    title,
    description: description || "",
    brand: brand || "GBB",
    status: status || "draft",
    tags: tags || [],
  });
  return NextResponse.json({ concept });
}
