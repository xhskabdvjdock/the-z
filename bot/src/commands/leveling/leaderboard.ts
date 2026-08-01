import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { LevelUser } from "@thez/shared";
import { config } from "../../config";

const MEDALS = ["🥇", "🥈", "🥉"];

const command: BotCommand = {
  name: "leaderboard",
  description: "عرض قائمة أفضل 10 أعضاء من حيث الخبرة",
  category: "مستويات",
  guildOnly: true,
  async run(ctx) {
    const topUsers = await LevelUser.find({ guildId: ctx.guild.id })
      .sort({ totalXp: -1 })
      .limit(10);

    if (!topUsers.length) {
      await ctx.reply("📭 لا يوجد أعضاء لديهم خبرة مسجّلة في هذا السيرفر بعد.");
      return;
    }

    const lines = await Promise.all(
      topUsers.map(async (u, index) => {
        const member = await ctx.guild.members.fetch(u.userId).catch(() => null);
        const name = member ? member.user.tag : `<@${u.userId}>`;
        const prefix = MEDALS[index] ?? `**${index + 1}.**`;
        return `${prefix} ${name} — المستوى **${u.level}** (${u.totalXp} XP)`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor(config.defaultColor)
      .setTitle("🏆 قائمة المتصدرين")
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${ctx.guild.name}` });

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
