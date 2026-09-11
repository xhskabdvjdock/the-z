import { create } from "yt-dlp-exec";

const ytdlp = create("yt-dlp");

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) {
      return Response.json({ error: "رابط غير صالح" }, { status: 400 });
    }

    console.log(`[download] Trying url: ${url.slice(0, 80)}`);
    const videoUrl = await getVideoUrl(url);
    if (!videoUrl) {
      console.log(`[download] Failed for url: ${url.slice(0, 80)}`);
      return Response.json({ error: "فشل الحصول على الفيديو — تأكد أن الرابط صحيح والفيديو عام. جرب رابط تيك توك/تويتر/انستا عام." }, { status: 400 });
    }

    console.log(`[download] Success: ${videoUrl.slice(0, 80)}`);
    return Response.json({ url: videoUrl });
  } catch (err) {
    console.error("[download] Error:", err);
    return Response.json({ error: `حدث خطأ: ${err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100)}` }, { status: 500 });
  }
}

async function getVideoUrl(url: string): Promise<string | null> {
  try {
    const output = (await (ytdlp as any)(url, {
      getUrl: true,
      format: "best[ext=mp4]/best",
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true
    })) as unknown as string;
    const videoUrl = typeof output === "string" ? output.trim() : String(output ?? "").trim();
    if (videoUrl && videoUrl.startsWith("http")) return videoUrl;
  } catch {}
  // Fallback TikWM/Cobalt
  if (url.includes("tiktok.com")) {
    try {
      const res = await fetch("https://www.tikwm.com/api/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const v = data?.data?.play ?? data?.data?.hdplay;
        if (v) return v;
      }
    } catch {}
  }
  for (const endpoint of ["https://api.cobalt.tools/api/json", "https://co.wuk.sh/api/json"]) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const v = data?.url ?? data?.picker?.[0]?.url;
      if (v) return v;
    } catch {
      continue;
    }
  }
  return null;
}