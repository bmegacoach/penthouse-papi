import { NextRequest, NextResponse } from "next/server";
import { updateConcept, deleteConcept } from "@/lib/concepts/store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const concept = await updateConcept(id, body);
  if (!concept) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ concept });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteConcept(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
