import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

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
      await ctx.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر." });
      return;
    }

    if (!target.isCommunicationDisabled()) {
      await ctx.reply({ content: "❌ هذا العضو ليس مكتوماً حالياً." });
      return;
    }

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await ctx.reply({ content: "❌ لا أملك صلاحية إدارة كتم الأعضاء." });
      return;
    }

    try {
      await target.timeout(null);
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء محاولة فك الكتم." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🔊 تم فك الكتم عن عضو")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "بواسطة", value: ctx.user.tag }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
