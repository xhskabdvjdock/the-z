import { AttachmentBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { BotCommand } from "../../types/command";
import { convertAttachmentToGif } from "../../utils/gifConverter";
import { logError } from "../../utils/logger";

const command: BotCommand = {
  name: "gif",
  description: "تحويل فيديو أو صورة إلى GIF — يعمل في الخاص حتى لو البوت خارج السيرفر",
  category: "أدوات",
  dmEnabled: true,
  options: [
    {
      name: "file",
      description: "الفيديو أو الصورة المرفقة (mp4/webm/mov/png/jpg/webp...)",
      type: "attachment",
      required: true
    },
    { name: "fps", description: "الإطارات في الثانية (5-30، الافتراضي 12)", type: "integer" },
    { name: "width", description: "عرض الـ GIF بالبكسل (128-640، الافتراضي 480)", type: "integer" },
    { name: "seconds", description: "مدة الـ GIF بالثواني (الفيديو حتى 30، الصورة حتى 10)", type: "integer" }
  ],
  async run(ctx) {
    const replyError = async (text: string) => {
      const embed = new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${text}`);
      if (ctx.isSlash && ctx.interaction) {
        const it = ctx.interaction;
        if (it.deferred || it.replied) {
          await it.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
        } else {
          await it.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
        }
      } else {
        await ctx.reply({ embeds: [embed] }).catch(() => null);
      }
    };

    try {
      const attachment = ctx.getAttachment("file") ?? ctx.message?.attachments.first() ?? null;
      if (!attachment) {
        await replyError("أرفق فيديو أو صورة مع الأمر: `/gif file:...`");
        return;
      }

      if (ctx.isSlash && ctx.interaction && !ctx.interaction.deferred) {
        await ctx.interaction.deferReply().catch(() => null);
      }

      const gifBuffer = await convertAttachmentToGif(attachment, {
        fps: ctx.getInteger("fps") ?? undefined,
        width: ctx.getInteger("width") ?? undefined,
        seconds: ctx.getInteger("seconds") ?? undefined
      });

      const gif = new AttachmentBuilder(gifBuffer, { name: "converted.gif" });
      await ctx.reply({
        content: `✅ تم التحويل — ${attachment.name}`,
        files: [gif]
      });
    } catch (err) {
      logError("gif-command", err);
      await replyError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء التحويل.");
    }
  }
};

export default command;
