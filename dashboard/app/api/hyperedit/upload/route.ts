import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "memory", "uploads");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      ok: true,
      filename,
      path: filePath,
      size: file.size,
      originalName: file.name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
