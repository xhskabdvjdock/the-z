import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";
import { recordModerationLog } from "../../modules/moderation/auditLog";

const MAX_TIMEOUT_MINUTES = 40320; // الحد الأقصى المسموح به من ديسكورد (28 يوماً)

const command: BotCommand = {
  name: "mute",
  description: "كتم عضو لمدة محددة",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  guildOnly: true,
  options: [
    { name: "user", description: "العضو المستهدف", type: "user", required: true },
    { name: "duration", description: "مدة الكتم بالدقائق", type: "integer", required: true },
    { name: "reason", description: "سبب الكتم", type: "string", required: false }
  ],
  async run(ctx) {
    const target = await ctx.getMember("user");
    const duration = ctx.getInteger("duration");
    const reason = ctx.getString("reason") ?? "لا يوجد سبب";

    if (!target) {
      await replyWithAutoDelete(ctx, "لم يتم العثور على هذا العضو في السيرفر.", ctx.guild.id);
      return;
    }

    if (duration === null || duration <= 0 || duration > MAX_TIMEOUT_MINUTES) {
      await replyWithAutoDelete(ctx, `يجب أن تكون المدة بين 1 و ${MAX_TIMEOUT_MINUTES} دقيقة.`, ctx.guild.id);
      return;
    }

    if (target.id === ctx.user.id) {
      await replyWithAutoDelete(ctx, "لا يمكنك كتم نفسك.", ctx.guild.id);
      return;
    }

    if (target.id === ctx.guild.ownerId) {
      await replyWithAutoDelete(ctx, "لا يمكنك كتم مالك السيرفر.", ctx.guild.id);
      return;
    }

    if (
      ctx.guild.ownerId !== ctx.user.id &&
      target.roles.highest.position >= ctx.member.roles.highest.position
    ) {
      await replyWithAutoDelete(ctx, "لا يمكنك كتم عضو برتبة مساوية أو أعلى من رتبتك.", ctx.guild.id);
      return;
    }

    if (!target.moderatable) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية كافية لكتم هذا العضو.", ctx.guild.id);
      return;
    }

    try {
      await target.timeout(duration * 60_000, reason);
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء محاولة تنفيذ الكتم.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("تم كتم عضو")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "المدة", value: `${duration} دقيقة` },
        { name: "بواسطة", value: ctx.user.tag },
        { name: "السبب", value: reason }
      );

    await ctx.reply({ embeds: [embed] });
    await recordModerationLog({
      guildId: ctx.guild.id,
      userId: target.id,
      moderatorId: ctx.user.id,
      action: "mute",
      reason,
      durationMinutes: duration
    });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed, undefined, {
      executorId: ctx.user.id,
      executorTag: ctx.user.tag,
      targetId: target.id,
      targetTag: target.user.tag,
      reason: reason,
      duration: `${duration} دقيقة`,
      channelId: ctx.channel.id,
      channelName: ('name' in ctx.channel ? ctx.channel.name : undefined) || undefined
    });
  }
};

export default command;
