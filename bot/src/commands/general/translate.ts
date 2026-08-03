import { EmbedBuilder, Message } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { translate } from "@vitalets/google-translate-api";

const command: BotCommand = {
  name: "translate",
  description: "ترجمة النص تلقائياً (عربي ↔ إنجليزي)",
  category: "عام",
  guildOnly: true,
  async run(ctx) {
    // تحقق من وجود رسالة مختارة
    const message = ctx.message as Message;
    const referencedMessage = message.reference?.messageId 
      ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null)
      : null;

    if (!referencedMessage) {
      await ctx.reply("❌ يجب تحديد رسالة لترجمتها");
      return;
    }

    const text = referencedMessage.content;
    if (!text || text.trim().length === 0) {
      await ctx.reply("❌ الرسالة المحددة لا تحتوي على نص");
      return;
    }

    // تحديد لغة النص
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const targetLang = isArabic ? "en" : "ar";

    try {
      const result = await translate(text, { to: targetLang });

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle(isArabic ? "🇬🇧 ترجمة إلى الإنجليزية" : "🇸🇦 ترجمة إلى العربية")
        .setDescription(result.text)
        .addFields(
          { name: "النص الأصلي", value: text.substring(0, 1024) },
          { name: "اللغة المكتشفة", value: isArabic ? "العربية" : "الإنجليزية" }
        )
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Translation error:", error);
      await ctx.reply("❌ فشلت الترجمة، يرجى المحاولة مرة أخرى");
    }
  }
};

export default command;
