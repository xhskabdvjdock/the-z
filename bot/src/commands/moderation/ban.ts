import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

const command: BotCommand = {
  name: "ban",
  description: "حظر عضو من السيرفر",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  guildOnly: true,
  options: [
    { name: "user", description: "العضو المستهدف", type: "user", required: true },
    { name: "reason", description: "سبب الحظر", type: "string", required: false }
  ],
  async run(ctx) {
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason") ?? "لا يوجد سبب";

    if (!target) {
      await ctx.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر." });
      return;
    }

    if (target.id === ctx.user.id) {
      await ctx.reply({ content: "❌ لا يمكنك حظر نفسك." });
      return;
    }

    if (target.id === ctx.guild.ownerId) {
      await ctx.reply({ content: "❌ لا يمكنك حظر مالك السيرفر." });
      return;
    }

    if (
      ctx.guild.ownerId !== ctx.user.id &&
      target.roles.highest.position >= ctx.member.roles.highest.position
    ) {
      await ctx.reply({ content: "❌ لا يمكنك حظر عضو برتبة مساوية أو أعلى من رتبتك." });
      return;
    }

    if (!target.bannable) {
      await ctx.reply({ content: "❌ لا أملك صلاحية كافية لحظر هذا العضو." });
      return;
    }

    try {
      await target.ban({ reason });
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء محاولة تنفيذ الحظر." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔨 تم حظر عضو")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "بواسطة", value: ctx.user.tag },
        { name: "السبب", value: reason }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
