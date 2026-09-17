import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { fileTokenId, verifyDownloadToken } from "@thez/shared";
import { getFilePath } from "@/lib/downloader/yt-dlp";
import { requireApiUser } from "@/lib/apiAuth";

/**
 * GET /api/download/file/[id]?file=NAME&token=...
 *
 * الوصول مسموح إما بتوقيع ملف صالح (صادر عن /api/download لنفس الـ jobId والملف)
 * أو بجلسة لوحة تحكم مصرّح لها. الـ jobId عشوائي قصير العمر، والتوقيع يمنع
 * أي وصول عابر للملفات.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  const filename = req.nextUrl.searchParams.get("file") ?? `the-z-${jobId}.mp4`;
  const token = req.nextUrl.searchParams.get("token");

  const tokenValid = verifyDownloadToken("file", fileTokenId(jobId, filename), token);
  if (!tokenValid) {
    const auth = await requireApiUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Invalid or expired download link." }, { status: 401 });
    }
  }

  const filePath = getFilePath(jobId, filename);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  // تحقق إضافي: المسار المحلول يجب أن يبقى داخل مجلد التحميل
  const resolved = path.resolve(filePath);
  const baseDir = path.resolve(process.env.DOWNLOADER_TEMP_DIR || "/tmp/the-z-downloads");
  if (!resolved.startsWith(baseDir + path.sep)) {
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
