import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

const command: BotCommand = {
  name: "unban",
  description: "فك الحظر عن مستخدم عبر آيديه",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  guildOnly: true,
  options: [
    { name: "user_id", description: "آيدي المستخدم المراد فك حظره", type: "string", required: true }
  ],
  async run(ctx) {
    const userId = ctx.getString("user_id");

    if (!userId || !/^\d{17,20}$/.test(userId)) {
      await ctx.reply({ content: "❌ يرجى إدخال آيدي مستخدم صحيح." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await ctx.reply({ content: "❌ لا أملك صلاحية فك حظر الأعضاء." });
      return;
    }

    const bans = await ctx.guild.bans.fetch().catch(() => null);
    if (!bans || !bans.has(userId)) {
      await ctx.reply({ content: "❌ هذا المستخدم غير محظور في السيرفر." });
      return;
    }

    try {
      await ctx.guild.members.unban(userId);
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء محاولة فك الحظر." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ تم فك الحظر")
      .addFields(
        { name: "المستخدم", value: `<@${userId}> (${userId})` },
        { name: "بواسطة", value: ctx.user.tag }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
