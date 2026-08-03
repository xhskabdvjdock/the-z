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
    const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(text);
    
    let targetLang: string;
    let languageName: string;
    let title: string;

    if (isArabic) {
      targetLang = "en";
      languageName = "العربية";
      title = "🇬🇧 ترجمة إلى الإنجليزية";
    } else if (isEnglish) {
      targetLang = "ar";
      languageName = "الإنجليزية";
      title = "🇸🇦 ترجمة إلى العربية";
    } else {
      targetLang = "en";
      languageName = "لغة أخرى";
      title = "🇬🇧 ترجمة إلى الإنجليزية";
    }

    try {
      const result = await translate(text, { to: targetLang });

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setDescription(result.text);

      await ctx.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Translation error:", error);
      await ctx.reply("❌ فشلت الترجمة، يرجى المحاولة مرة أخرى");
    }
  }
};

export default command;
