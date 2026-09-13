import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getFilePath } from "@/lib/downloader/yt-dlp";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  const filename = req.nextUrl.searchParams.get("file") ?? `the-z-${jobId}.mp4`;

  const filePath = getFilePath(jobId, filename);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  try {
    await fs.promises.access(filePath);
  } catch {
    return NextResponse.json({ error: "File not found or expired." }, { status: 404 });
  }

  const stats = await fs.promises.stat(filePath);
  const fileBuffer = await fs.promises.readFile(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(stats.size),
      "Cache-Control": "private, max-age=0"
    }
  });
}