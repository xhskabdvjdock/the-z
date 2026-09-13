import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const TEMP_DIR = process.env.DOWNLOADER_TEMP_DIR || "/tmp/the-z-downloads";
const MAX_FILE_SIZE_MB = parseInt(process.env.DOWNLOADER_MAX_FILE_SIZE_MB ?? "100", 10);
const TIMEOUT_SECONDS = parseInt(process.env.DOWNLOADER_TIMEOUT_SECONDS ?? "60", 10);

export interface DownloadResult {
  jobId: string;
  filePath: string;
  filename: string;
  size: number;
}

export async function downloadWithYtDlp(url: string, platform: string): Promise<DownloadResult> {
  const jobId = randomUUID().slice(0, 8);
  const jobDir = path.join(TEMP_DIR, jobId);
  await fs.promises.mkdir(jobDir, { recursive: true });

  const outputTemplate = path.join(jobDir, `the-z-${platform}-%(id)s.%(ext)s`);

  console.log(`[Downloader] Platform: ${platform}`);
  console.log(`[Downloader] URL validated: ${url.slice(0, 60)}`);
  console.log(`[Downloader] Starting yt-dlp for job ${jobId}`);

  try {
    const args = [
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate",
      "--prefer-free-formats",
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", outputTemplate,
      "--max-filesize", `${MAX_FILE_SIZE_MB}M`,
      url
    ];

    const { stdout, stderr } = await execFileAsync("yt-dlp", args, {
      timeout: TIMEOUT_SECONDS * 1000,
      maxBuffer: 10 * 1024 * 1024
    });

    if (stderr) console.log(`[Downloader] yt-dlp stderr: ${stderr.slice(0, 200)}`);

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

    // تنظيف تلقائي بعد 15 دقيقة
    setTimeout(() => cleanup(jobId).catch(() => null), 15 * 60 * 1000);

    return { jobId, filePath, filename: safeFilename, size: stats.size };
  } catch (err) {
    await cleanup(jobId).catch(() => null);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Downloader] yt-dlp failed for job ${jobId}: ${msg.slice(0, 200)}`);
    if (msg.includes("Video unavailable") || msg.includes("Private")) throw new Error("The video is unavailable or private.");
    if (msg.includes("No video")) throw new Error("No downloadable video was found in this post.");
    if (msg.includes("File too large")) throw new Error("The video is too large to process.");
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) throw new Error("The downloader service is currently unavailable.");
    throw new Error("The video could not be downloaded.");
  }
}

export async function cleanup(jobId: string): Promise<void> {
  const jobDir = path.join(TEMP_DIR, jobId);
  try {
    await fs.promises.rm(jobDir, { recursive: true, force: true });
    console.log(`[Downloader] Cleaned up job ${jobId}`);
  } catch {}
}

export function getFilePath(jobId: string, filename: string): string | null {
  // منع Path Traversal
  if (!/^[a-z0-9-]{8}$/i.test(jobId)) return null;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  if (!filename.startsWith("the-z-")) return null;
  return path.join(TEMP_DIR, jobId, filename);
}