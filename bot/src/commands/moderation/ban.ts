import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";
import { replyWithAutoDelete } from "../../utils/replyWithAutoDelete";
import { scheduleAutoDelete } from "../../utils/autoDeleteReply";
import { recordModerationLog } from "../../modules/moderation/auditLog";

const command: BotCommand = {
  name: "ban",
  description: "حظر عضو من السيرفر",
  category: "إشراف",
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  guildOnly: true,
  options: [
    { name: "user", description: "العضو المستهدف", type: "user", required: true },
    { name: "reason", description: "سبب الحظر", type: "string", required: false },
    { name: "delete_days", description: "حذف رسائل العضو خلال آخر (0-7) يوم", type: "integer", required: false }
  ],
  async run(ctx) {
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason") ?? "لا يوجد سبب";
    const deleteDays =
      typeof ctx.getInteger === "function" ? (ctx.getInteger("delete_days") ?? 0) : 0;

    if (Number.isInteger(deleteDays) && (deleteDays < 0 || deleteDays > 7)) {
      await replyWithAutoDelete(ctx, "يجب أن تكون أيام حذف الرسائل بين 0 و 7.", ctx.guild.id);
      return;
    }

    const user = target?.user ?? (await ctx.getUser("user"));

    if (!user) {
      await replyWithAutoDelete(ctx, "لم يتم العثور على هذا المستخدم.", ctx.guild.id);
      return;
    }

    if (user.id === ctx.user.id) {
      await replyWithAutoDelete(ctx, "لا يمكنك حظر نفسك.", ctx.guild.id);
      return;
    }

    if (user.id === ctx.guild.ownerId) {
      await replyWithAutoDelete(ctx, "لا يمكنك حظر مالك السيرفر.", ctx.guild.id);
      return;
    }

    if (
      target &&
      ctx.guild.ownerId !== ctx.user.id &&
      target.roles.highest.position >= ctx.member.roles.highest.position
    ) {
      await replyWithAutoDelete(ctx, "لا يمكنك حظر عضو برتبة مساوية أو أعلى من رتبتك.", ctx.guild.id);
      return;
    }

    if (target && !target.bannable) {
      await replyWithAutoDelete(ctx, "لا أملك صلاحية كافية لحظر هذا العضو.", ctx.guild.id);
      return;
    }

    try {
      if (target) {
        // عضو حاضر — حظر عبر العضوية (مع تجاوز محسوب لحذف الرسائل بالثواني)
        const deleteSeconds = deleteDays > 0 ? deleteDays * 86400 : undefined;
        await target.ban({
          reason,
          ...(deleteSeconds != null ? { deleteMessageSeconds: deleteSeconds } : {})
        });
      } else {
        // عضو غير موجود في السيرفر — حظر بالمعرف مباشرة (سلوك ديسكورد القياسي)
        await ctx.guild.bans.create(user.id, {
          reason,
          ...(deleteDays > 0 ? { deleteMessageDays: deleteDays } : {})
        });
      }
    } catch {
      await replyWithAutoDelete(ctx, "حدث خطأ أثناء محاولة تنفيذ الحظر.", ctx.guild.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("تم حظر عضو")
      .addFields(
        { name: "العضو", value: `${user.tag} (${user.id})` },
        { name: "بواسطة", value: ctx.user.tag },
        { name: "السبب", value: reason },
        ...(deleteDays > 0 ? [{ name: "حذف رسائل", value: `آخر ${deleteDays} يوم`, inline: true }] : [])
      );

    const reply = await ctx.reply({ embeds: [embed] });

    await scheduleAutoDelete(reply, ctx.guild.id);

    await sendLog(ctx.client, ctx.guild.id, "moderation", embed, undefined, {
      executorId: ctx.user.id,
      executorTag: ctx.user.tag,
      targetId: user.id,
      targetTag: user.tag,
      reason: reason,
      channelId: ctx.channel.id,
      channelName: ('name' in ctx.channel ? ctx.channel.name : undefined) || undefined,
      details: {
        deleteDays: deleteDays
      }
    });
  }
};

export default command;
