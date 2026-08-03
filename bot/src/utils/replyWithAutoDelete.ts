import { Message, TextChannel } from "discord.js";
import { GuildConfig } from "@thez/shared";
import { CommandContext } from "../types/command";

/**
 * يرسل رد بسيط ويحذفه تلقائياً بعد فترة محددة من الإعدادات
 * @param ctx سياق الأمر
 * @param content محتوى الرد
 * @param guildId معرف السيرفر
 */
export async function replyWithAutoDelete(
  ctx: CommandContext,
  content: string,
  guildId: string
): Promise<void> {
  const config = await GuildConfig.findOne({ guildId });
  const autoDeleteSeconds = config?.moderation?.autoDeleteConfirmation ?? 3;

  const reply = await ctx.reply({ content });

  if (autoDeleteSeconds > 0 && reply) {
    setTimeout(async () => {
      try {
        await reply.delete();
      } catch {
        // تجاهل إذا تم حذف الرسالة بالفعل
      }
    }, autoDeleteSeconds * 1000);
  }
}

/**
 * يرسل رد بسيط (للرسائل العادية) ويحذفه تلقائياً بعد فترة محددة من الإعدادات
 * @param message الرسالة الأصلية
 * @param content محتوى الرد
 * @param guildId معرف السيرفر
 */
export async function sendWithAutoDelete(
  message: Message,
  content: string,
  guildId: string
): Promise<void> {
  const config = await GuildConfig.findOne({ guildId });
  const autoDeleteSeconds = config?.moderation?.autoDeleteConfirmation ?? 3;

  if (message.channel instanceof TextChannel) {
    const reply = await message.channel.send(content);

    if (autoDeleteSeconds > 0 && reply) {
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch {
          // تجاهل إذا تم حذف الرسالة بالفعل
        }
      }, autoDeleteSeconds * 1000);
    }
  }
}
