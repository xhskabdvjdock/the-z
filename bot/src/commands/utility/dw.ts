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

async function getVideoViaFallback(url: string): Promise<string | null> {
  // TikTok fallback
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
  // Cobalt fallback
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

    const dashboardUrl = process.env.DASHBOARD_URL ?? process.env.NEXTAUTH_URL ?? "https://the-z-o3lt.onrender.com";
    const baseUrl = dashboardUrl.includes("localhost") ? "https://the-z-o3lt.onrender.com" : dashboardUrl;
    const dlPageUrl = `${baseUrl.replace(/\/$/, "")}/downloader?url=${encodeURIComponent(url)}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("تم تجهيز الفيديو")
      .setDescription(`[فتح صفحة التحميل](${dlPageUrl})\n\nاضغط الرابط لمشاهدة الفيديو وتحميله`)
      .setFooter({ text: "الديسكورد لا يدعم الفيديوهات الكبيرة — التحميل عبر المتصفح" });

    const msg = `تم تجهيز الفيديو — افتح: ${dlPageUrl}`;
    if (ctx.isSlash && ctx.interaction?.deferred) {
      await ctx.interaction.editReply({ content: msg, embeds: [embed] }).catch(() => null);
    } else {
      await ctx.reply({ content: msg, embeds: [embed] });
    }
  }
};

export default command;