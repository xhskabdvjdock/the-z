import { NextRequest, NextResponse } from "next/server";
import { createDownloadToken, fileTokenId, verifyDownloadToken } from "@thez/shared";
import { validateUrl } from "@/lib/downloader/platform";
import { downloadWithYtDlp } from "@/lib/downloader/yt-dlp";
import { checkRateLimit } from "@/lib/downloader/rateLimit";
import { requireApiUser } from "@/lib/apiAuth";

/**
 * POST /api/download
 *
 * يُسمح بالطلب في حالتين فقط:
 *  1) رابط موقّع صالح (`sig`) صادر عن البوت عبر الأمر `,dw` — بدون تسجيل دخول.
 *  2) جلسة لوحة تحكم مصرّح لها (القائمة البيضاء).
 * أي طلب آخر يُرفض بـ 401 قبل الوصول إلى yt-dlp.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

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
  const signature = typeof body?.sig === "string" ? body.sig : null;

  const validation = validateUrl(url);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 1) رابط موقّع من البوت
  const signatureValid = verifyDownloadToken("url", url, signature);

  // 2) أو جلسة لوحة تحكم مصرّح لها
  if (!signatureValid) {
    const auth = await requireApiUser();
    if (!auth.ok) {
      return NextResponse.json(
        {
          error: signature
            ? "انتهت صلاحية الرابط أو تم تعديله — استخدم الأمر ,dw مرة أخرى."
            : "هذا الرابط يحتاج تسجيل دخول لوحة التحكم، أو استخدم الأمر ,dw من البوت."
        },
        { status: 401 }
      );
    }
  }

  try {
    const result = await downloadWithYtDlp(url, validation.platform!);
    const fileToken = createDownloadToken("file", fileTokenId(result.jobId, result.filename));
    const downloadUrl = `/api/download/file/${result.jobId}?file=${encodeURIComponent(result.filename)}${
      fileToken ? `&token=${encodeURIComponent(fileToken)}` : ""
    }`;

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: "completed",
      filename: result.filename,
      downloadUrl,
      size: result.size
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "The video could not be downloaded.";
    return NextResponse.json({ error: msg }, { status: mapDownloadErrorStatus(msg) });
  }
}

/** تحويل رسالة خطأ yt-dlp إلى رمز HTTP مناسب (بدون فروع غير قابلة للوصول) */
function mapDownloadErrorStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("rate-limit") || lower.includes("rate limit") || lower.includes("429")) return 429;
  if (lower.includes("file too large") || lower.includes("too large")) return 413;
  if (lower.includes("private") || lower.includes("login required") || lower.includes("not logged in")) return 403;
  if (lower.includes("unavailable") || lower.includes("no video") || lower.includes("no downloadable")) return 404;
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimedout") ||
    lower.includes("service") ||
    lower.includes("busy")
  ) {
    return 503;
  }
  return 500;
}
