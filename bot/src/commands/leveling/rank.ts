import { AttachmentBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { LevelUser, levelFromTotalXp } from "@thez/shared";
import { generateRankCard } from "../../modules/leveling/rankCard";

const command: BotCommand = {
  name: "rank",
  description: "عرض بطاقة رتبتك أو رتبة عضو آخر",
  category: "مستويات",
  guildOnly: true,
  options: [{ name: "user", description: "العضو المراد عرض رتبته", type: "user", required: false }],
  async run(ctx) {
    const targetUser = (await ctx.getUser("user")) ?? ctx.user;
    const targetMember =
      targetUser.id === ctx.user.id ? ctx.member : await ctx.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await ctx.reply("❌ لم أتمكن من العثور على هذا العضو في السيرفر.");
      return;
    }

    const doc = await LevelUser.findOne({ guildId: ctx.guild.id, userId: targetUser.id });
    const totalXp = doc?.totalXp ?? 0;
    const info = levelFromTotalXp(totalXp);

    const rank =
      (await LevelUser.countDocuments({
        guildId: ctx.guild.id,
        totalXp: { $gt: totalXp }
      })) + 1;

    const buffer = await generateRankCard(targetMember, {
      level: info.level,
      currentXp: info.currentLevelXp,
      neededXp: info.neededXp,
      rank,
      totalXp
    });

    const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });
    await ctx.reply({ files: [attachment] });
  }
};

export default command;
