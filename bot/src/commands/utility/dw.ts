import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";

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

    const dashboardUrl = process.env.DASHBOARD_URL ?? process.env.NEXTAUTH_URL ?? "https://the-z-o3lt.onrender.com";
    const baseUrl = dashboardUrl.includes("localhost") ? "https://the-z-o3lt.onrender.com" : dashboardUrl;
    const dlPageUrl = `${baseUrl.replace(/\/$/, "")}/downloader?url=${encodeURIComponent(url)}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("صفحة التحميل جاهزة")
      .setDescription(`[فتح صفحة التحميل](${dlPageUrl})\n\nالصق الرابط هناك لمشاهدة الفيديو وتحميله`)
      .setFooter({ text: "التحميل يتم عبر المتصفح" });

    await ctx.reply({ content: `صفحة التحميل: ${dlPageUrl}`, embeds: [embed] });
  }
};

export default command;
