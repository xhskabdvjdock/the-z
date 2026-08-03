import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";

const command: BotCommand = {
  name: "unmute",
  description: "فك الكتم عن عضو",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  guildOnly: true,
  options: [{ name: "user", description: "العضو المستهدف", type: "user", required: true }],
  async run(ctx) {
    const target = await ctx.getMember("user");

    if (!target) {
      await replyWithAutoDelete(ctx, "لم يتم العثور على هذا العضو في السيرفر.", ctx.guild.id);
      return;
    }

    if (!target.isCommunicationDisabled()) {
      await replyWithAutoDelete(ctx, "هذا العضو ليس مكتوماً حالياً.", ctx.guild.id);
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية إدارة كتم الأعضاء.", ctx.guild.id);
      return;
    }

    try {
      await target.timeout(null);
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء محاولة فك الكتم.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم فك الكتم عن عضو")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "بواسطة", value: ctx.user.tag }
      );

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
