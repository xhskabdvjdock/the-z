import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { create } from "yt-dlp-exec";

const ytdlp = create("yt-dlp");

async function getVideoViaYtDlp(url: string): Promise<string | null> {
  try {
    const output = (await ytdlp(url, {
      getUrl: true,
      format: "best[ext=mp4]/best",
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true
    } as any)) as unknown as string;
    const videoUrl = typeof output === "string" ? output.trim() : String(output ?? "").trim();
    if (videoUrl && videoUrl.startsWith("http")) return videoUrl;
    return null;
  } catch {
    return null;
  }
}

const command: BotCommand = {
  name: "dw",
  description: "تحميل فيديو من رابط (تيك توك/انستا/تويتر) — يعمل في الخاص فقط",
  category: "أدوات",
  dmEnabled: true,
  guildOnly: false,
  options: [
    { name: "url", description: "رابط الفيديو", type: "string", required: true }
  ],
  async run(ctx) {
    // السماح فقط في الخاص
    if (ctx.guild) {
      await ctx.reply({ content: "هذا الأمر يعمل في الخاص فقط. راسل البوت على الخاص." });
      return;
    }

    const url = ctx.getString("url");
    if (!url) {
      await ctx.reply({ content: "أرسل رابط الفيديو." });
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      await ctx.reply({ content: "الرابط غير صالح." });
      return;
    }

    const isSupported = /tiktok\.com|instagram\.com|instagr\.am|twitter\.com|x\.com|t\.co/i.test(url);
    if (!isSupported) {
      await ctx.reply({ content: "المنصات المدعومة حاليًا: تيك توك، انستا، تويتر." });
      return;
    }

    // defer لتجنب timeout
    if (ctx.isSlash && ctx.interaction && !ctx.interaction.deferred) {
      await ctx.interaction.deferReply().catch(() => null);
    } else {
      await ctx.reply({ content: "جاري التحميل..." });
    }

    const videoUrl = await getVideoViaYtDlp(url);
    if (!videoUrl) {
      const msg = "فشل التحميل — تأكد أن الرابط صحيح والفيديو عام. جرب رابط آخر.";
      if (ctx.isSlash && ctx.interaction?.deferred) await ctx.interaction.editReply({ content: msg }).catch(() => null);
      else await ctx.reply({ content: msg });
      return;
    }

    try {
      // yt-dlp يعطي رابط مباشر، نحمله
      const res = await fetch(videoUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error("fetch failed");
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 25 * 1024 * 1024) {
        const msg = "الفيديو كبير جدًا (أكثر من 25MB). جرب رابط مباشر: " + videoUrl.slice(0, 300);
        if (ctx.isSlash && ctx.interaction?.deferred) await ctx.interaction.editReply({ content: msg }).catch(() => null);
        else await ctx.reply({ content: msg });
        return;
      }
      const attachment = new AttachmentBuilder(buffer, { name: "video.mp4" });
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("تم التحميل").setDescription(`[رابط أصلي](${url})`);
      if (ctx.isSlash && ctx.interaction?.deferred) {
        await ctx.interaction.editReply({ embeds: [embed], files: [attachment] }).catch(() => null);
      } else {
        await ctx.reply({ embeds: [embed], files: [attachment] });
      }
    } catch (err) {
      // إذا فشل التحميل، أرسل الرابط المباشر
      const fallback = `تم الحصول على الرابط المباشر: ${videoUrl.slice(0, 400)}`;
      if (ctx.isSlash && ctx.interaction?.deferred) await ctx.interaction.editReply({ content: fallback }).catch(() => null);
      else await ctx.reply({ content: fallback });
    }
  }
};

export default command;