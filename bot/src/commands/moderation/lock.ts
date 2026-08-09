import { BaseGuildTextChannel, EmbedBuilder, PermissionFlagsBits, ChannelType, ThreadChannel } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";
import { recordModerationLog } from "../../modules/moderation/auditLog";

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

    // Allow BaseGuildTextChannel (TextChannel and NewsChannel) and ThreadChannel (voice chat)
    if (!(selected instanceof BaseGuildTextChannel) && !(selected instanceof ThreadChannel)) {
      await replyWithAutoDelete(ctx, "لا يمكن قفل هذا النوع من الرومات.", ctx.guild.id);
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية إدارة الرومات.", ctx.guild.id);
      return;
    }

    try {
      if (selected instanceof ThreadChannel) {
        // For threads (voice chat), lock the thread
        await selected.setLocked(true);
      } else {
        // For channels, edit permission overwrites
        await selected.permissionOverwrites.edit(ctx.guild.roles.everyone, {
          SendMessages: false
        });
      }
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء قفل الروم.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("تم قفل الروم")
      .addFields(
        { name: "الروم", value: `${selected}` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    await ctx.reply({ embeds: [embed] });
    await recordModerationLog({
      guildId: ctx.guild.id,
      userId: ctx.user.id,
      moderatorId: ctx.user.id,
      action: "lock",
      reason: selected.id
    });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
