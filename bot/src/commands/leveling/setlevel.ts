import { PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { LevelUser, xpForLevel } from "@thez/shared";

const command: BotCommand = {
  name: "setlevel",
  description: "تعديل مستوى عضو معيّن",
  category: "مستويات",
  guildOnly: true,
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  options: [
    { name: "user", description: "العضو المراد تعديل مستواه", type: "user", required: true },
    { name: "level", description: "المستوى الجديد", type: "integer", required: true }
  ],
  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply("❌ تحتاج صلاحية `إدارة السيرفر` لاستخدام هذا الأمر.");
      return;
    }

    const targetUser = await ctx.getUser("user");
    const level = ctx.getInteger("level");

    if (!targetUser) {
      await ctx.reply("❌ يجب تحديد عضو صالح.");
      return;
    }

    if (level === null || level < 0) {
      await ctx.reply("❌ يجب تحديد مستوى صحيح (رقم صفر أو أكبر).");
      return;
    }

    let totalXp = 0;
    for (let i = 0; i < level; i++) {
      totalXp += xpForLevel(i);
    }

    await LevelUser.findOneAndUpdate(
      { guildId: ctx.guild.id, userId: targetUser.id },
      { $set: { totalXp, level, xp: 0 } },
      { upsert: true }
    );

    await ctx.reply(`✅ تم تعديل مستوى <@${targetUser.id}> إلى **${level}** بنجاح.`);
  }
};

export default command;
