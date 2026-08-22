import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";
import { recordModerationLog } from "../../modules/moderation/auditLog";

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
      await replyWithAutoDelete(ctx, "يرجى إدخال آيدي مستخدم صحيح.", ctx.guild.id);
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية فك حظر الأعضاء.", ctx.guild.id);
      return;
    }

    const bans = await ctx.guild.bans.fetch().catch(() => null);
    if (!bans || !bans.has(userId)) {
      await replyWithAutoDelete(ctx, "هذا المستخدم غير محظور في السيرفر.", ctx.guild.id);
      return;
    }

    try {
      await ctx.guild.members.unban(userId);
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء محاولة فك الحظر.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم فك الحظر")
      .addFields(
        { name: "المستخدم", value: `<@${userId}> (${userId})` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    await ctx.reply({ embeds: [embed] });
    await recordModerationLog({
      guildId: ctx.guild.id,
      userId,
      moderatorId: ctx.user.id,
      action: "unban"
    });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
