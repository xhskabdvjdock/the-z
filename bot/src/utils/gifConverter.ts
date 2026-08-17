import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { Attachment } from "discord.js";

const execFileAsync = promisify(execFile);

export const GIF_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
export const GIF_VIDEO_EXT = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];
export const GIF_ALLOWED_EXT = [...GIF_IMAGE_EXT, ...GIF_VIDEO_EXT, ".gif"];

const MAX_INPUT_BYTES = 25 * 1024 * 1024; // حد رفع Discord في الخاص
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 120_000;

export interface GifConvertOptions {
  fps?: number;
  width?: number;
  /** مدة الـ GIF بالثواني — الصورة افتراضيًا 3، والفيديو كاملًا ما لم تُحدد */
  seconds?: number;
  /** حد أقصى للمدة عند عدم تحديد seconds (يُستخدم في قوائم السياق) */
  videoCapSeconds?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function downloadAttachment(attachment: Attachment): Promise<Buffer> {
  const res = await fetch(attachment.url);
  if (!res.ok) throw new Error("تعذر تحميل الملف من Discord — حاول مجددًا.");
  return Buffer.from(await res.arrayBuffer());
}

/** يحمّل المرفق ويحوّله إلى GIF عبر ffmpeg — يُرجع محتوى الـ GIF */
export async function convertAttachmentToGif(
  attachment: Attachment,
  options: GifConvertOptions = {}
): Promise<Buffer> {
  const ext = path.extname(attachment.name || attachment.url.split("?")[0]).toLowerCase();
  if (!GIF_ALLOWED_EXT.includes(ext)) {
    throw new Error(
      `صيغة الملف غير مدعومة (\`${ext || "غير معروفة"}\`).\nالمدعوم: ${[...GIF_IMAGE_EXT, ...GIF_VIDEO_EXT].join(", ")}`
    );
  }
  if (attachment.size > MAX_INPUT_BYTES) {
    throw new Error("الملف أكبر من 25MB — ارفع ملفًا أصغر.");
  }

  const buffer = await downloadAttachment(attachment);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "thez-gif-"));
  const inputPath = path.join(tmpDir, `input${ext}`);
  const outputPath = path.join(tmpDir, "output.gif");
  await fs.writeFile(inputPath, buffer);

  const fps = clamp(options.fps ?? 12, 5, 30);
  const width = clamp(options.width ?? 480, 128, 640);

  try {
    let ffmpegArgs: string[];
    if (GIF_IMAGE_EXT.includes(ext)) {
      const duration = options.seconds ? clamp(options.seconds, 1, 10) : 3;
      ffmpegArgs = [
        "-y",
        "-loop", "1",
        "-i", inputPath,
        "-t", String(duration),
        "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`,
        outputPath
      ];
    } else {
      ffmpegArgs = ["-y", "-i", inputPath];
      const duration = options.seconds
        ? clamp(options.seconds, 1, 30)
        : options.videoCapSeconds
          ? clamp(options.videoCapSeconds, 1, 30)
          : null;
      if (duration) ffmpegArgs.push("-t", String(duration));
      ffmpegArgs.push("-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`, outputPath);
    }

    await execFileAsync("ffmpeg", ffmpegArgs, {
      timeout: FFMPEG_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024
    }).catch((err) => {
      throw new Error(
        `تعذر تحويل الملف (${err instanceof Error ? err.message.slice(0, 120) : "خطأ ffmpeg"}). تأكد أنه فيديو/صورة سليمة.`
      );
    });

    const out = await fs.readFile(outputPath).catch(() => null);
    if (!out || out.length === 0) {
      throw new Error("فشل التحويل — الملف الناتج فارغ.");
    }
    if (out.length > MAX_OUTPUT_BYTES) {
      throw new Error("الـ GIF الناتج أكبر من 20MB — جرّب `width` أصغر أو `seconds` أقل.");
    }
    return out;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => null);
  }
}
