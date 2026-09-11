import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";

async function downloadTikTok(url: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.data?.play ?? data?.data?.hdplay ?? data?.data?.wmplay ?? null;
  } catch {
    return null;
  }
}

async function downloadViaCobalt(url: string): Promise<string | null> {
  const endpoints = ["https://api.cobalt.tools/api/json", "https://co.wuk.sh/api/json", "https://api.cobalt.tools/"];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(12000)
      });
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const videoUrl = data?.url ?? data?.picker?.[0]?.url ?? null;
      if (videoUrl) return videoUrl;
    } catch {
      continue;
    }
  }
  return null;
}

async function getVideoUrl(url: string): Promise<string | null> {
  if (url.includes("tiktok.com")) {
    const tiktok = await downloadTikTok(url);
    if (tiktok) return tiktok;
  }
  // محاولة عبر Cobalt للكل (تويتر، انستا، تيك توك)
  return downloadViaCobalt(url);
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

    const videoUrl = await getVideoUrl(url);
    if (!videoUrl) {
      const msg = "فشل التحميل — تأكد أن الرابط صحيح والفيديو عام. جرب رابط آخر.";
      if (ctx.isSlash && ctx.interaction?.deferred) await ctx.interaction.editReply({ content: msg }).catch(() => null);
      else await ctx.reply({ content: msg });
      return;
    }

    try {
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
      const fallback = `فشل إرسال الفيديو — جرب رابط مباشر: ${videoUrl.slice(0, 400)}`;
      if (ctx.isSlash && ctx.interaction?.deferred) await ctx.interaction.editReply({ content: fallback }).catch(() => null);
      else await ctx.reply({ content: fallback });
    }
  }
};

export default command;