import { EmbedBuilder, PermissionFlagsBits, TextChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { GuildConfig } from "@thez/shared";

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
      await ctx.reply({ content: "❌ يجب أن يكون العدد بين 1 و 100." });
      return;
    }

    if (!(ctx.channel instanceof TextChannel)) {
      await ctx.reply({ content: "❌ لا يمكن استخدام هذا الأمر في هذا النوع من الرومات." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await ctx.reply({ content: "❌ لا أملك صلاحية إدارة الرسائل." });
      return;
    }

    let deletedCount = 0;
    try {
      const deleted = await ctx.channel.bulkDelete(amount, true);
      deletedCount = deleted.size;
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء حذف الرسائل (قد تكون أقدم من 14 يوماً)." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🧹 تم حذف الرسائل")
      .addFields(
        { name: "العدد", value: `${deletedCount}` },
        { name: "الروم", value: `${ctx.channel}` },
        { name: "بواسطة", value: ctx.user.tag }
      )
      .setTimestamp();

    const reply = await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);

    // حذف رسالة التأكيد تلقائياً إذا كان الإعداد مفعل
    const config = await GuildConfig.findOne({ guildId: ctx.guild.id });
    const autoDeleteSeconds = config?.moderation?.autoDeleteConfirmation ?? 0;
    
    if (autoDeleteSeconds > 0 && reply) {
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch {
          // تجاهل إذا تم حذف الرسالة بالفعل
        }
      }, autoDeleteSeconds * 1000);
    }
  }
};

export default command;
