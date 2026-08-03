import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Warning } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";

const command: BotCommand = {
  name: "warn",
  description: "توجيه تحذير لعضو",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  guildOnly: true,
  options: [
    { name: "user", description: "العضو المستهدف", type: "user", required: true },
    { name: "reason", description: "سبب التحذير", type: "string", required: true }
  ],
  async run(ctx) {
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason");

    if (!target) {
      await replyWithAutoDelete(ctx, "❌ لم يتم العثور على هذا العضو في السيرفر.", ctx.guild.id);
      return;
    }

    if (!reason) {
      await replyWithAutoDelete(ctx, "❌ يرجى كتابة سبب التحذير.", ctx.guild.id);
      return;
    }

    if (target.id === ctx.user.id) {
      await replyWithAutoDelete(ctx, "❌ لا يمكنك تحذير نفسك.", ctx.guild.id);
      return;
    }

    await Warning.create({
      guildId: ctx.guild.id,
      userId: target.id,
      moderatorId: ctx.user.id,
      reason
    });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("⚠️ تم توجيه تحذير")
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
