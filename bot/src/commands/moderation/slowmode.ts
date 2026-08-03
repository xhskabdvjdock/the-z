import { BaseGuildTextChannel, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";

const command: BotCommand = {
  name: "slowmode",
  description: "تحديد وضع البطيء في الروم",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  guildOnly: true,
  options: [
    { name: "seconds", description: "المدة بالثواني (0-21600)", type: "integer", required: true }
  ],
  async run(ctx) {
    const seconds = ctx.getInteger("seconds");

    if (seconds === null || seconds < 0 || seconds > 21600) {
      await replyWithAutoDelete(ctx, "يجب أن تكون المدة بين 0 و 21600 ثانية.", ctx.guild.id);
      return;
    }

    if (!(ctx.channel instanceof BaseGuildTextChannel)) {
      await replyWithAutoDelete(ctx, "لا يمكن استخدام هذا الأمر في هذا النوع من الرومات.", ctx.guild.id);
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية إدارة الرومات.", ctx.guild.id);
      return;
    }

    try {
      await ctx.channel.setRateLimitPerUser(seconds);
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء تحديد وضع البطيء.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم تحديث وضع البطيء")
      .addFields(
        { name: "الروم", value: `${ctx.channel}` },
        { name: "المدة", value: seconds === 0 ? "معطّل" : `${seconds} ثانية` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
