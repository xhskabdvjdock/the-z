import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { Attachment, AttachmentBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { logError } from "../../utils/logger";

const execFileAsync = promisify(execFile);

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const VIDEO_EXT = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // حد رفع Discord في الخاص
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 120_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function downloadAttachment(attachment: Attachment): Promise<Buffer> {
  const res = await fetch(attachment.url);
  if (!res.ok) throw new Error("تعذر تحميل الملف من Discord — حاول مجددًا.");
  return Buffer.from(await res.arrayBuffer());
}

const command: BotCommand = {
  name: "gif",
  description: "تحويل فيديو أو صورة إلى GIF — يعمل في الخاص حتى لو البوت خارج السيرفر",
  category: "أدوات",
  dmEnabled: true,
  options: [
    {
      name: "file",
      description: "الفيديو أو الصورة المرفقة (mp4/webm/mov/png/jpg/webp...)",
      type: "attachment",
      required: true
    },
    { name: "fps", description: "الإطارات في الثانية (5-30، الافتراضي 12)", type: "integer" },
    { name: "width", description: "عرض الـ GIF بالبكسل (128-640، الافتراضي 480)", type: "integer" },
    { name: "seconds", description: "مدة الـ GIF بالثواني (الفيديو حتى 30، الصورة حتى 10)", type: "integer" }
  ],
  async run(ctx) {
    const replyError = async (text: string) => {
      const embed = new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${text}`);
      if (ctx.isSlash && ctx.interaction) {
        const it = ctx.interaction;
        if (it.deferred || it.replied) {
          await it
            .followUp({ embeds: [embed], flags: MessageFlags.Ephemeral })
            .catch(() => null);
        } else {
          await it.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
        }
      } else {
        await ctx.reply({ embeds: [embed] }).catch(() => null);
      }
    };

    try {
      const attachment = ctx.getAttachment("file") ?? ctx.message?.attachments.first() ?? null;
      if (!attachment) {
        await replyError("أرفق فيديو أو صورة مع الأمر: `/gif file:...`");
        return;
      }

      const ext = path.extname(attachment.name || attachment.url.split("?")[0]).toLowerCase();
      if (![...IMAGE_EXT, ...VIDEO_EXT, ".gif"].includes(ext)) {
        await replyError(
          `صيغة الملف غير مدعومة (\`${ext || "غير معروفة"}\`).\nالمدعوم: ${[...IMAGE_EXT, ...VIDEO_EXT].join(", ")}`
        );
        return;
      }

      if (attachment.size > MAX_INPUT_BYTES) {
        await replyError("الملف أكبر من 25MB — ارفع ملفًا أصغر.");
        return;
      }

      if (ctx.isSlash && ctx.interaction && !ctx.interaction.deferred) {
        await ctx.interaction.deferReply().catch(() => null);
      }

      const buffer = await downloadAttachment(attachment);
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "thez-gif-"));
      const inputPath = path.join(tmpDir, `input${ext}`);
      const outputPath = path.join(tmpDir, "output.gif");
      await fs.writeFile(inputPath, buffer);

      const fps = clamp(ctx.getInteger("fps") ?? 12, 5, 30);
      const width = clamp(ctx.getInteger("width") ?? 480, 128, 640);
      const seconds = ctx.getInteger("seconds");

      let ffmpegArgs: string[];
      if (IMAGE_EXT.includes(ext)) {
        const duration = seconds ? clamp(seconds, 1, 10) : 3;
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
        if (seconds) ffmpegArgs.push("-t", String(clamp(seconds, 1, 30)));
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

      const gif = new AttachmentBuilder(out, { name: "converted.gif" });
      await ctx.reply({
        content: `✅ تم التحويل — ${attachment.name}`,
        files: [gif]
      });

      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    } catch (err) {
      logError("gif-command", err);
      await replyError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء التحويل."
      );
    }
  }
};

export default command;
