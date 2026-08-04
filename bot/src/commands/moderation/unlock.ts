import { BaseGuildTextChannel, EmbedBuilder, PermissionFlagsBits, ThreadChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";

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

    // Allow BaseGuildTextChannel (TextChannel and NewsChannel) and ThreadChannel (voice chat)
    if (!(selected instanceof BaseGuildTextChannel) && !(selected instanceof ThreadChannel)) {
      await replyWithAutoDelete(ctx, "لا يمكن فتح هذا النوع من الرومات.", ctx.guild.id);
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية إدارة الرومات.", ctx.guild.id);
      return;
    }

    try {
      if (selected instanceof ThreadChannel) {
        // For threads (voice chat), unlock the thread
        await selected.setLocked(false);
      } else {
        // For channels, edit permission overwrites
        await selected.permissionOverwrites.edit(ctx.guild.roles.everyone, {
          SendMessages: null
        });
      }
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء فتح الروم.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم فتح الروم")
      .addFields(
        { name: "الروم", value: `${selected}` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
