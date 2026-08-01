import { BaseGuildTextChannel, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

const command: BotCommand = {
  name: "unlock",
  description: "فتح الروم للسماح بإرسال الرسائل",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  guildOnly: true,
  options: [
    { name: "channel", description: "الروم المراد فتحه (اختياري)", type: "channel", required: false }
  ],
  async run(ctx) {
    const selected = ctx.getChannel("channel") ?? ctx.channel;

    if (!(selected instanceof BaseGuildTextChannel)) {
      await ctx.reply({ content: "❌ لا يمكن فتح هذا النوع من الرومات." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.reply({ content: "❌ لا أملك صلاحية إدارة الرومات." });
      return;
    }

    try {
      await selected.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: null
      });
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء فتح الروم." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🔓 تم فتح الروم")
      .addFields(
        { name: "الروم", value: `${selected}` },
        { name: "بواسطة", value: ctx.user.tag }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
