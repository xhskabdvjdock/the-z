import { AttachmentBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { LevelUser } from "@thez/shared";
import { generateLeaderboardCard, LeaderboardEntry } from "../../modules/leveling/rankCard";

const command: BotCommand = {
  name: "leaderboard",
  description: "عرض صورة قائمة أفضل 10 أعضاء من حيث الخبرة",
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

    const entries: LeaderboardEntry[] = await Promise.all(
      topUsers.map(async (u, index) => {
        const member = await ctx.guild.members.fetch(u.userId).catch(() => null);
        return {
          rank: index + 1,
          username: member?.displayName ?? member?.user?.tag ?? `Unknown (${u.userId})`,
          avatarUrl: member?.displayAvatarURL({ extension: "png", size: 128 }) ?? null,
          level: u.level,
          totalXp: u.totalXp
        };
      })
    );

    const buffer = await generateLeaderboardCard(entries, ctx.guild.name);
    const attachment = new AttachmentBuilder(buffer, { name: "leaderboard.png" });
    await ctx.reply({ files: [attachment] });
  }
};

export default command;
