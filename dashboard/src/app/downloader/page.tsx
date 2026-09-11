"use client";

import { useState } from "react";

export default function DownloaderPage() {
  const [url, setUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (inputUrl?: string) => {
    const targetUrl = inputUrl ?? url;
    if (!targetUrl.trim()) {
      setError("أدخل رابط الفيديو");
      return;
    }
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل التحميل");
      setVideoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  // دعم ?url= في الرابط
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const qUrl = params.get("url");
    if (qUrl && !videoUrl && !loading && !url) {
      setUrl(qUrl);
      // لا نحمّل تلقائيًا حتى يضغط المستخدم
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">تحميل الفيديو</h1>
      <p className="mb-6 text-sm text-slate-500">الصق رابط تيك توك / انستا / تويتر واحصل على رابط مباشر مع زر تحميل</p>

      <div className="card flex flex-col gap-4">
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="https://tiktok.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDownload()}
          />
          <button onClick={() => handleDownload()} disabled={loading || !url.trim()} className="btn-primary whitespace-nowrap">
            {loading ? "جاري..." : "تحميل"}
          </button>
        </div>

        {error && <p className="text-sm text-[#EF4444]">{error}</p>}

        {videoUrl && (
          <div className="flex flex-col gap-4 rounded-xl border border-[#2A2D37] p-4">
            <video src={videoUrl} controls className="w-full rounded-lg" style={{ maxHeight: "500px" }} />
            <a href={videoUrl} download target="_blank" rel="noopener noreferrer" className="btn-primary text-center">
              تحميل الفيديو
            </a>
            <p className="text-xs text-slate-500 break-all">رابط مباشر: {videoUrl.slice(0, 80)}...</p>
          </div>
        )}
      </div>
    </div>
  );
}