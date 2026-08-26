import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Warning } from "@thez/shared";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";
import { scheduleAutoDelete } from "../../utils/autoDeleteReply";
import { recordModerationLog } from "../../modules/moderation/auditLog";

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
      await replyWithAutoDelete(ctx, "لم يتم العثور على هذا العضو في السيرفر.", ctx.guild.id);
      return;
    }

    if (!reason) {
      await replyWithAutoDelete(ctx, "يرجى كتابة سبب التحذير.", ctx.guild.id);
      return;
    }

    if (target.id === ctx.user.id) {
      await replyWithAutoDelete(ctx, "لا يمكنك تحذير نفسك.", ctx.guild.id);
      return;
    }

    if (target.id === ctx.guild.ownerId) {
      await replyWithAutoDelete(ctx, "لا يمكنك تحذير مالك السيرفر.", ctx.guild.id);
      return;
    }

    if (
      ctx.guild.ownerId !== ctx.user.id &&
      target.roles.highest.position >= ctx.member.roles.highest.position
    ) {
      await replyWithAutoDelete(
        ctx,
        "لا يمكنك تحذير عضو برتبة مساوية أو أعلى من رتبتك.",
        ctx.guild.id
      );
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
      .setTitle("تم توجيه تحذير")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "بواسطة", value: ctx.user.tag },
        { name: "السبب", value: reason }
      );

    const reply = await ctx.reply({ embeds: [embed] });

    await scheduleAutoDelete(reply, ctx.guild.id);

    await recordModerationLog({
      guildId: ctx.guild.id,
      userId: target.id,
      moderatorId: ctx.user.id,
      action: "warn",
      reason
    });

    await sendLog(ctx.client, ctx.guild.id, "moderation", embed, undefined, {
      executorId: ctx.user.id,
      executorTag: ctx.user.tag,
      targetId: target.id,
      targetTag: target.user.tag,
      reason: reason,
      channelId: ctx.channel.id,
      channelName: ('name' in ctx.channel ? ctx.channel.name : undefined) || undefined
    });
  }
};

export default command;
