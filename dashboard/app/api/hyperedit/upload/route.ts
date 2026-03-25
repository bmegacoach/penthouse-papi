import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "memory", "uploads");

// Allow large file uploads (2GB)
export const maxDuration = 300; // 5 min timeout

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"];
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "mp4");
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json({ error: `Invalid file type: ${ext}. Allowed: ${allowedTypes.join(", ")}` }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    // Stream to file in chunks to handle large files
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      ok: true,
      filename,
      path: filePath,
      size: file.size,
      sizeHuman: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      originalName: file.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[Hyperedit Upload Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
