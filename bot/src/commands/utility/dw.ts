import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";

async function downloadTikTok(url: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.data?.play ?? data?.data?.hdplay ?? null;
  } catch {
    return null;
  }
}

async function downloadViaCobalt(url: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.url ?? data?.picker?.[0]?.url ?? null;
  } catch {
    return null;
  }
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

    await ctx.reply({ content: "جاري التحميل..." });

    const videoUrl = await getVideoUrl(url);
    if (!videoUrl) {
      await ctx.reply({ content: "فشل التحميل — تأكد أن الرابط صحيح والفيديو عام." });
      return;
    }

    try {
      const res = await fetch(videoUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error("fetch failed");
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 25 * 1024 * 1024) {
        await ctx.reply({ content: "الفيديو كبير جدًا (أكثر من 25MB)." });
        return;
      }
      const attachment = new AttachmentBuilder(buffer, { name: "video.mp4" });
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("تم التحميل").setDescription(`[رابط أصلي](${url})`);
      await ctx.reply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      await ctx.reply({ content: `فشل إرسال الفيديو — جرب رابط مباشر: ${videoUrl.slice(0, 400)}` });
    }
  }
};

export default command;