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
  // المحاولة 1: btch-downloader
  try {
    const btch: any = await import("btch-downloader");
    const lower = url.toLowerCase();
    let data: any = null;
    if (lower.includes("tiktok.com") && btch.tiktok) data = await btch.tiktok(url);
    else if ((lower.includes("instagram.com") || lower.includes("instagr.am")) && btch.instagram) data = await btch.instagram(url);
    else if ((lower.includes("twitter.com") || lower.includes("x.com") || lower.includes("t.co")) && btch.twitter) data = await btch.twitter(url);
    else if (btch.default?.tiktok && lower.includes("tiktok.com")) data = await btch.default.tiktok(url);
    if (data) {
      const videoUrl = data.mp4 ?? data.url ?? data.video?.[0] ?? data.download?.[0]?.url ?? null;
      if (videoUrl && typeof videoUrl === "string" && videoUrl.startsWith("http")) return videoUrl;
      // btch قد يعيد مصفوفة
      if (Array.isArray(data) && data[0]?.url) return data[0].url;
      if (typeof data === "string" && data.startsWith("http")) return data;
    }
  } catch (err) {
    console.log("[download] btch failed:", String(err).slice(0, 100));
  }

  // المحاولة 2: TikWM
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
  // المحاولة 3: Cobalt
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