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
  // تنظيف رابط انستا من البراميترات
  const cleanUrl = url.split("?")[0].split("&")[0];
  const urlToTry = cleanUrl || url;

  // المحاولة 1: btch-downloader
  try {
    const btch: any = await import("btch-downloader");
    const lower = urlToTry.toLowerCase();
    let data: any = null;
    if (lower.includes("tiktok.com") && btch.tiktok) data = await btch.tiktok(urlToTry);
    else if ((lower.includes("instagram.com") || lower.includes("instagr.am")) && btch.instagram) {
      try { data = await btch.instagram(url); } catch { data = await btch.instagram(urlToTry); }
    }
    else if ((lower.includes("twitter.com") || lower.includes("x.com") || lower.includes("t.co")) && btch.twitter) data = await btch.twitter(urlToTry);
    else if (btch.default?.tiktok && lower.includes("tiktok.com")) data = await btch.default.tiktok(urlToTry);
    if (data) {
      const v = (data as any).url ?? (data as any).mp4 ?? (data as any).video?.[0] ?? (data as any).download?.[0]?.url ?? (Array.isArray(data) ? (data as any)[0]?.url : null) ?? (typeof data === "string" ? data : null);
      if (v && typeof v === "string" && v.startsWith("http")) return v;
      // جرب كل الحقول المحتملة
      if (typeof data === "object") {
        const possible = JSON.stringify(data).match(/https:\/\/[^"]+\.mp4[^"]*/);
        if (possible) return possible[0].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }
    }
  } catch (err) {
    console.log("[download] btch failed:", String(err).slice(0, 120));
  }

  // المحاولة 1.5: Instagram scrape مباشر
  if ((urlToTry.includes("instagram.com") || urlToTry.includes("instagr.am")) && !urlToTry.includes("?__a=")) {
    try {
      const scrapeUrl = urlToTry.split("?")[0] + "?__a=1&__d=dis";
      const res = await fetch(scrapeUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/"video_url":"([^"]+)"/) ?? text.match(/video_url\\":\\"([^"]+)\\"/);
        if (match) {
          const v = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          if (v.startsWith("http")) return v;
        }
      }
    } catch {}
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