import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const TEMP_DIR = process.env.DOWNLOADER_TEMP_DIR || "/tmp/the-z-downloads";
const MAX_FILE_SIZE_MB = parseInt(process.env.DOWNLOADER_MAX_FILE_SIZE_MB ?? "100", 10);
const TIMEOUT_SECONDS = parseInt(process.env.DOWNLOADER_TIMEOUT_SECONDS ?? "60", 10);
/** حد أقصى للتحميلات المتزامنة — يحمي المعالج/الشبكة من الاستنزاف */
const MAX_CONCURRENCY = Math.max(1, parseInt(process.env.DOWNLOADER_MAX_CONCURRENCY ?? "2", 10) || 2);
/** أقصى انتظار في الطابور قبل الرفض */
const QUEUE_TIMEOUT_MS = 60 * 1000;
/** عمر الملفات المؤقتة قبل التنظيف (دقيقتان أكثر من مؤقت الحذف المعتاد) */
const STALE_AGE_MS = 17 * 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

let activeDownloads = 0;
const slotWaiters: Array<() => void> = [];
let lastSweepAt = 0;

/** يحجز خانة تحميل أو ينتظر في الطابور حتى تتوفر (أو يُرفض بعد مهلة) */
async function acquireSlot(): Promise<void> {
  if (activeDownloads < MAX_CONCURRENCY) {
    activeDownloads++;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    function grant() {
      clearTimeout(timer);
      activeDownloads++;
      resolve();
    }
    const timer = setTimeout(() => {
      const index = slotWaiters.indexOf(grant);
      if (index >= 0) slotWaiters.splice(index, 1);
      reject(new Error("The downloader service is busy right now. Please try again shortly."));
    }, QUEUE_TIMEOUT_MS);
    slotWaiters.push(grant);
  });
}

function releaseSlot(): void {
  activeDownloads = Math.max(0, activeDownloads - 1);
  const next = slotWaiters.shift();
  if (next) next();
}

/**
 * تنظيف دوري لمجلدات التحميل القديمة — التنظيف المعتاد يتم بـ setTimeout بعد 15 دقيقة،
 * لكنه يُفقد عند إعادة تشغيل العملية، لذا نكنس المتبقي دوريًا لتفادي امتلاء القرص.
 */
async function sweepStaleJobs(): Promise<void> {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  try {
    const entries = await fs.promises.readdir(TEMP_DIR, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const dirPath = path.join(TEMP_DIR, entry.name);
          try {
            const stats = await fs.promises.stat(dirPath);
            if (now - stats.mtimeMs > STALE_AGE_MS) {
              await fs.promises.rm(dirPath, { recursive: true, force: true });
            }
          } catch {}
        })
    );
  } catch {}
}

export interface DownloadResult {
  jobId: string;
  filePath: string;
  filename: string;
  size: number;
}

function getCookiesArgs(): string[] {
  const candidates = [
    process.env.INSTAGRAM_COOKIES_PATH,
    process.env.COOKIES_PATH,
    "/app/instagram_cookies.txt",
    "/tmp/instagram_cookies.txt",
    path.join(TEMP_DIR, "cookies.txt")
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 10) return ["--cookies", p];
    } catch {}
  }
  return [];
}

async function tryCobalt(url: string): Promise<string | null> {
  const customCobalt = process.env.COBALT_API_URL;
  if (customCobalt) {
    try {
      const res = await fetch(customCobalt, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const v = data?.url ?? data?.picker?.[0]?.url;
        if (typeof v === "string" && v.startsWith("http")) return v;
      }
    } catch {}
    return null;
  }
  if (url.includes("instagram.com")) {
    try {
      const res = await fetch("https://saveig.app/api/ajaxSearch", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://saveig.app/en",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        },
        body: `q=${encodeURIComponent(url)}&t=media&lang=en`,
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const html = data?.data ?? data?.html ?? "";
        if (html) {
          // يدعم href="...mp4..." او href='...mp4...' مع &amp;
          const patterns = [/href="([^"]+\.mp4[^"]*)"/, /href='([^']+\.mp4[^']*)'/, /href=\\"([^"]+\.mp4[^"]*)\\"/];
          for (const re of patterns) {
            const m = html.match(re);
            if (m) return m[1].replace(/&amp;/g, "&").replace(/\\\//g, "/");
          }
          // saveig احيانا يرجع JSON مباشر مع downloadUrl
          const direct = html.match(/https:\/\/[^"']+\.mp4[^"']*/);
          if (direct) return direct[0].replace(/&amp;/g, "&");
        }
      }
    } catch (e) {
      console.log(`[Downloader] saveig error: ${String(e).slice(0, 120)}`);
    }
  }
  return null;
}

/**
 * نقطة الدخول الوحيدة للتحميل — تفرض حد التزامن وتنظّف الملفات القديمة أولًا.
 */
export async function downloadWithYtDlp(url: string, platform: string): Promise<DownloadResult> {
  await acquireSlot();
  try {
    await sweepStaleJobs();
    return await runDownload(url, platform);
  } finally {
    releaseSlot();
  }
}

async function runDownload(url: string, platform: string): Promise<DownloadResult> {
  const isInstagram = platform === "instagram";
  if (isInstagram) {
    const cobaltUrl = await tryCobalt(url);
    if (cobaltUrl) {
      console.log(`[Downloader] Cobalt/saveig found URL`);
      const jobId = randomUUID().slice(0, 8);
      const jobDir = path.join(TEMP_DIR, jobId);
      await fs.promises.mkdir(jobDir, { recursive: true });
      try {
        const res = await fetch(cobaltUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.instagram.com/" } });
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > 1000) {
            const filePath = path.join(jobDir, `the-z-${platform}-${jobId}.mp4`);
            await fs.promises.writeFile(filePath, buffer);
            const stats = await fs.promises.stat(filePath);
            console.log(`[Downloader] Cobalt success for job ${jobId}, size: ${stats.size}`);
            setTimeout(() => cleanup(jobId).catch(() => null), 15 * 60 * 1000);
            return { jobId, filePath, filename: `the-z-${platform}-${jobId}.mp4`, size: stats.size };
          }
        }
      } catch (e) {
        console.log(`[Downloader] Cobalt fetch failed: ${String(e).slice(0, 120)}`);
      }
      await fs.promises.rm(jobDir, { recursive: true, force: true }).catch(() => null);
    }
  }

  const jobId = randomUUID().slice(0, 8);
  const jobDir = path.join(TEMP_DIR, jobId);
  await fs.promises.mkdir(jobDir, { recursive: true });

  const outputTemplate = path.join(jobDir, `the-z-${platform}-%(id)s.%(ext)s`);

  console.log(`[Downloader] Platform: ${platform}`);
  console.log(`[Downloader] URL validated: ${url.slice(0, 60)}`);
  console.log(`[Downloader] Starting yt-dlp for job ${jobId}`);

  const cookiesArgs = isInstagram ? getCookiesArgs() : [];
  if (cookiesArgs.length) console.log(`[Downloader] Using cookies: ${cookiesArgs[1]}`);

  try {
    const args = [
      "--no-warnings",
      "--no-check-certificate",
      "--prefer-free-formats",
      "--no-playlist",
      "--extractor-retries", "3",
      "--fragment-retries", "3",
      "--add-header", "Referer:https://www.instagram.com/",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", outputTemplate,
      "--max-filesize", `${MAX_FILE_SIZE_MB}M`,
      ...cookiesArgs,
      url
    ];

    const { stdout, stderr } = await execFileAsync("yt-dlp", args, {
      timeout: TIMEOUT_SECONDS * 1000,
      maxBuffer: 10 * 1024 * 1024
    });

    if (stderr) console.log(`[Downloader] yt-dlp stderr: ${stderr.slice(0, 500)}`);
    if (stdout) console.log(`[Downloader] yt-dlp stdout: ${stdout.slice(0, 300)}`);

    const files = await fs.promises.readdir(jobDir);
    const videoFile = files.find((f) => f.endsWith(".mp4") || f.endsWith(".mkv") || f.endsWith(".webm"));
    if (!videoFile) {
      throw new Error("No video file produced");
    }

    const filePath = path.join(jobDir, videoFile);
    const stats = await fs.promises.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      await cleanup(jobId);
      throw new Error("File too large");
    }

    if (stats.size === 0) throw new Error("Empty file");

    console.log(`[Downloader] Download completed for job ${jobId}, size: ${stats.size}`);
    const safeFilename = `the-z-${platform}-${jobId}.mp4`;
    const safePath = path.join(jobDir, safeFilename);
    if (videoFile !== safeFilename) {
      await fs.promises.rename(filePath, safePath).catch(() => null);
    }

    setTimeout(() => cleanup(jobId).catch(() => null), 15 * 60 * 1000);

    return { jobId, filePath: safePath, filename: safeFilename, size: stats.size };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Downloader] yt-dlp failed for job ${jobId}: ${msg.slice(0, 800)}`);
    if (isInstagram) {
      try {
        const fallbackUrl = await tryInstagramFallback(url);
        console.log(`[Downloader] Fallback URL: ${fallbackUrl?.slice(0, 80) ?? "null"}`);
        if (fallbackUrl) {
          await fs.promises.mkdir(jobDir, { recursive: true });
          const res = await fetch(fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.instagram.com/" } });
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > 1000) {
              const fallbackPath = path.join(jobDir, `the-z-${platform}-${jobId}.mp4`);
              await fs.promises.writeFile(fallbackPath, buffer);
              const stats = await fs.promises.stat(fallbackPath);
              console.log(`[Downloader] Fallback success for job ${jobId}, size: ${stats.size}`);
              setTimeout(() => cleanup(jobId).catch(() => null), 15 * 60 * 1000);
              return { jobId, filePath: fallbackPath, filename: `the-z-${platform}-${jobId}.mp4`, size: stats.size };
            }
          }
        }
      } catch (e) {
        console.log(`[Downloader] Fallback error: ${String(e).slice(0, 200)}`);
      }
    }
    await cleanup(jobId).catch(() => null);
    const lower = msg.toLowerCase();
    if (lower.includes("rate-limit") || lower.includes("exceeded") || lower.includes("429")) throw new Error("Instagram is temporarily rate-limiting downloads. Please try again in a few minutes. If persists, add Instagram cookies via INSTAGRAM_COOKIES_PATH.");
    if (lower.includes("login required") || lower.includes("not logged in") || lower.includes("private") ) throw new Error("The video is private or requires login. Try a public post or add cookies.");
    if (lower.includes("video unavailable") ) throw new Error("The video is unavailable or private.");
    if (lower.includes("no video")) throw new Error("No downloadable video was found in this post. The link may be invalid or the post is a photo album.");
    if (lower.includes("file too large")) throw new Error("The video is too large to process.");
    if (lower.includes("enoent")) throw new Error("The downloader service is currently unavailable. Please try again.");
    if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("etimedout")) throw new Error("The downloader service is currently unavailable. Please try again.");
    if (lower.includes("unsupported url")) throw new Error("Unsupported Instagram URL. Use a direct reel/post link like https://www.instagram.com/reel/XXXX/");
    throw new Error("The video could not be downloaded. " + msg.slice(0, 120));
  }
}

async function tryInstagramFallback(url: string): Promise<string | null> {
  try {
    const ig: any = await import("instagram-url-direct");
    let data: any = null;
    try { data = await ig.default?.(url); } catch {}
    if (!data || !data.url_list) {
      try { data = await (ig as any)(url); } catch {}
    }
    const v = data?.url_list?.[0] ?? data?.url ?? data?.results_number?.[0]?.url ?? data?.results_number?.[0];
    if (v && typeof v === "string" && v.startsWith("http")) return v;
    if (typeof v === "object" && v?.url) return v.url;
    if (data?.results_number?.[0]) {
      const first = data.results_number[0];
      if (typeof first === "string" && first.startsWith("http")) return first;
      if (first?.url) return first.url;
    }
    console.log(`[download] instagram-url-direct raw: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (err) {
    console.log(`[download] instagram-url-direct failed: ${String(err).slice(0, 100)}`);
  }
  const cleanUrl = url.split("?")[0].replace(/\/$/, "");
  try {
    const btch: any = await import("btch-downloader");
    const data = await btch.instagram(cleanUrl).catch(() => btch.instagram(url));
    const v = (data as any)?.url ?? (data as any)?.mp4 ?? (data as any)?.download?.[0]?.url ?? (data as any)?.result?.[0]?.url;
    if (v && typeof v === "string" && v.startsWith("http")) return v;
    console.log(`[download] btch raw: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (e) {
    console.log(`[download] btch failed: ${String(e).slice(0, 120)}`);
  }
  return null;
}

export async function cleanup(jobId: string): Promise<void> {
  const jobDir = path.join(TEMP_DIR, jobId);
  try {
    await fs.promises.rm(jobDir, { recursive: true, force: true });
    console.log(`[Downloader] Cleaned up job ${jobId}`);
  } catch {}
}

export function getFilePath(jobId: string, filename: string): string | null {
  if (!/^[a-z0-9-]{8}$/i.test(jobId)) return null;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  if (!filename.startsWith("the-z-")) return null;
  return path.join(TEMP_DIR, jobId, filename);
}
