import { BaseGuildTextChannel, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

const command: BotCommand = {
  name: "lock",
  description: "قفل الروم عن إرسال الرسائل",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  guildOnly: true,
  options: [
    { name: "channel", description: "الروم المراد قفله (اختياري)", type: "channel", required: false }
  ],
  async run(ctx) {
    const selected = ctx.getChannel("channel") ?? ctx.channel;

    if (!(selected instanceof BaseGuildTextChannel)) {
      await ctx.reply({ content: "❌ لا يمكن قفل هذا النوع من الرومات." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.reply({ content: "❌ لا أملك صلاحية إدارة الرومات." });
      return;
    }

    try {
      await selected.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: false
      });
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء قفل الروم." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔒 تم قفل الروم")
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
