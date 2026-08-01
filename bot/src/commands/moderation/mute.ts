import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { BotCommand } from "../../types/command";
import { sendLog } from "../../modules/logging/logger";

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
      await ctx.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر." });
      return;
    }

    if (duration === null || duration <= 0 || duration > MAX_TIMEOUT_MINUTES) {
      await ctx.reply({ content: `❌ يجب أن تكون المدة بين 1 و ${MAX_TIMEOUT_MINUTES} دقيقة.` });
      return;
    }

    if (target.id === ctx.user.id) {
      await ctx.reply({ content: "❌ لا يمكنك كتم نفسك." });
      return;
    }

    if (target.id === ctx.guild.ownerId) {
      await ctx.reply({ content: "❌ لا يمكنك كتم مالك السيرفر." });
      return;
    }

    if (
      ctx.guild.ownerId !== ctx.user.id &&
      target.roles.highest.position >= ctx.member.roles.highest.position
    ) {
      await ctx.reply({ content: "❌ لا يمكنك كتم عضو برتبة مساوية أو أعلى من رتبتك." });
      return;
    }

    if (!target.moderatable) {
      await ctx.reply({ content: "❌ لا أملك صلاحية كافية لكتم هذا العضو." });
      return;
    }

    try {
      await target.timeout(duration * 60_000, reason);
    } catch {
      await ctx.reply({ content: "❌ حدث خطأ أثناء محاولة تنفيذ الكتم." });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔇 تم كتم عضو")
      .addFields(
        { name: "العضو", value: `${target.user.tag} (${target.id})` },
        { name: "المدة", value: `${duration} دقيقة` },
        { name: "بواسطة", value: ctx.user.tag },
        { name: "السبب", value: reason }
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
    await sendLog(ctx.client, ctx.guild.id, "moderation", embed);
  }
};

export default command;
