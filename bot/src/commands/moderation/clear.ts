import { EmbedBuilder, PermissionFlagsBits, TextChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { scheduleAutoDelete } from "../../utils/autoDeleteReply";
import { recordModerationLog } from "../../modules/moderation/auditLog";

const command: BotCommand = {
  name: "clear",
  description: "حذف عدد من الرسائل في الروم",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
  guildOnly: true,
  options: [
    { name: "amount", description: "عدد الرسائل المراد حذفها (1-100)", type: "integer", required: true }
  ],
  async run(ctx) {
    const amount = ctx.getInteger("amount");

    if (amount === null || amount < 1 || amount > 100) {
      await ctx.reply({ content: "يجب أن يكون العدد بين 1 و 100." });
      return;
    }

    if (!(ctx.channel instanceof TextChannel)) {
      await ctx.reply({ content: "لا يمكن استخدام هذا الأمر في هذا النوع من الرومات." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await ctx.reply({ content: "لا أملك صلاحية إدارة الرسائل." });
      return;
    }

    let deletedCount = 0;
    try {
      const deleted = await ctx.channel.bulkDelete(amount, true);
      deletedCount = deleted.size;
    } catch {
      await ctx.reply({ content: "حدث خطأ أثناء حذف الرسائل (قد تكون أقدم من 14 يوماً)." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم حذف الرسائل")
      .addFields(
        { name: "العدد", value: `${deletedCount}` },
        { name: "الروم", value: `${ctx.channel}` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    const reply = await ctx.reply({ embeds: [embed] });
    await recordModerationLog({
      guildId: ctx.guild.id,
      userId: ctx.user.id,
      moderatorId: ctx.user.id,
      action: "clear",
      reason: `حذف ${deletedCount} رسالة في <#${ctx.channel.id}>`
    });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);

    await scheduleAutoDelete(reply, ctx.guild.id);
  }
};

export default command;
