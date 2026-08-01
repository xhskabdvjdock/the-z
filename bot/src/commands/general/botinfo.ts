import { EmbedBuilder, version as djsVersion } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}ي ${hours}س ${minutes}د ${seconds}ث`;
}

const command: BotCommand = {
  name: "botinfo",
  description: "عرض معلومات عن البوت",
  category: "عام",
  async run(ctx) {
    const guildCount = ctx.client.guilds.cache.size;
    const userCount = ctx.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const uptime = formatUptime(ctx.client.uptime ?? 0);

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle(`🤖 معلومات ${ctx.client.user?.username ?? "البوت"}`)
      .setThumbnail(ctx.client.user?.displayAvatarURL({ size: 512 }) ?? null)
      .addFields(
        { name: "عدد السيرفرات", value: `${guildCount}`, inline: true },
        { name: "عدد المستخدمين", value: `${userCount}`, inline: true },
        { name: "مدة التشغيل", value: uptime, inline: true },
        { name: "إصدار discord.js", value: djsVersion, inline: true },
        { name: "إصدار Node.js", value: process.version, inline: true }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
