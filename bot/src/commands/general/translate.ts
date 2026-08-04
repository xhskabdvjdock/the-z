import { EmbedBuilder, Message } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import { translate } from "@vitalets/google-translate-api";

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
        .setTitle("نتيجة الترجمة")
        .addFields(
          { name: "النص الأصلي", value: text.substring(0, 1000) },
          { name: "الترجمة", value: translatedText }
        );

      await ctx.reply({ embeds: [embed] });
      return;
    }

    try {
      // إرسال إشعار مؤقت بأن الترجمة جارية
      const loadingMsg = await ctx.reply("جاري الترجمة...");

      // تنفيذ عملية الترجمة باستخدام المكتبة
      const result = await translate(text, { to: targetLang });

      // التأكد من أن النص المترجم لا يتجاوز حد Discord
      const translatedText = result.text.length > 4096 
        ? result.text.substring(0, 4093) + "..." 
        : result.text;

      // حفظ في الذاكرة المؤقتة
      translationCache.set(cacheKey, { text: result.text, timestamp: now });

      // إنشاء الـ Embed
      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle("نتيجة الترجمة")
        .addFields(
          { name: "النص الأصلي", value: text.substring(0, 1000) },
          { name: "الترجمة", value: translatedText },
          { name: "التفاصيل", value: `إلى ${targetLang.toUpperCase()}`, inline: true }
        )
        .setFooter({ text: `طلب بواسطة ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      // تعديل رسالة الانتظار بالنتيجة النهائية
      if (loadingMsg) {
        await loadingMsg.edit({ content: null, embeds: [embed] });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      
      if (error.message?.includes('Too Many Requests')) {
        await ctx.reply("ترجمة كثيرة جداً، يرجى الانتظار قليلاً قبل المحاولة مرة أخرى");
      } else {
        await ctx.reply("حدث خطأ أثناء محاولة الترجمة، تأكد من صحة رمز اللغة والنص.");
      }
    }
  }
};

export default command;
