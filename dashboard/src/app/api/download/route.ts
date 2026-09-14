import { NextRequest, NextResponse } from "next/server";
import { validateUrl } from "@/lib/downloader/platform";
import { downloadWithYtDlp } from "@/lib/downloader/yt-dlp";
import { checkRateLimit } from "@/lib/downloader/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.ip ?? "unknown";

  const rate = await checkRateLimit(`download:${ip}`, 5, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const url = body?.url;
  const validation = validateUrl(url);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await downloadWithYtDlp(url, validation.platform!);
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: "completed",
      filename: result.filename,
      downloadUrl: `/api/download/file/${result.jobId}?file=${result.filename}`,
      size: result.size
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "The video could not be downloaded.";
    const lower = msg.toLowerCase();
    let status = 500;
    if (lower.includes("rate-limit") || lower.includes("429")) status = 429;
    else if (lower.includes("unavailable") || lower.includes("no video") || lower.includes("no downloadable")) status = 404;
    else if (lower.includes("private") || lower.includes("login")) status = 403;
    else if (lower.includes("too large")) status = 413;
    else if (lower.includes("unavailable") || lower.includes("timeout") || lower.includes("unavailable")) status = 503;
    return NextResponse.json({ error: msg }, { status });
  }
}