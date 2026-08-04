import { EmbedBuilder, Message } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { translate } from "google-translate-api-x";

// بسيط تخزين مؤقت للترجمات لتجنب الطلبات المكررة
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

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
      await ctx.reply("يجب تحديد رسالة لترجمتها");
      return;
    }

    const text = referencedMessage.content;
    if (!text || text.trim().length === 0) {
      await ctx.reply("الرسالة المحددة لا تحتوي على نص");
      return;
    }

    // تحديد لغة النص
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(text);
    
    let targetLang: string;

    if (isArabic) {
      targetLang = "en";
    } else if (isEnglish) {
      targetLang = "ar";
    } else {
      targetLang = "en";
    }

    // التحقق من الذاكرة المؤقتة
    const cacheKey = `${text.substring(0, 100)}_${targetLang}`;
    const cached = translationCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      const translatedText = cached.text.length > 4096 
        ? cached.text.substring(0, 4093) + "..." 
        : cached.text;

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setDescription(translatedText);

      await ctx.reply({ embeds: [embed] });
      return;
    }

    try {
      // استخدام LibreTranslate API العام
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: targetLang,
          format: 'text'
        })
      });

      const data = await response.json() as { translatedText: string };

      if (!data.translatedText) {
        await ctx.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
        return;
      }

      // التأكد من أن النص المترجم لا يتجاوز حد Discord
      const translatedText = data.translatedText.length > 4096 
        ? data.translatedText.substring(0, 4093) + "..." 
        : data.translatedText;

      // حفظ في الذاكرة المؤقتة
      translationCache.set(cacheKey, { text: data.translatedText, timestamp: now });

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setDescription(translatedText);

      await ctx.reply({ embeds: [embed] });
    } catch (error: any) {
      console.error("Translation error:", error);
      await ctx.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
    }
  }
};

export default command;
