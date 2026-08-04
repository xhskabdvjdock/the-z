import { Message, EmbedBuilder } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { buildPrefixContext } from "../utils/context";
import { checkCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";
import { handleAutoMod } from "../modules/automod/automod";
import { handleAutoResponse } from "../modules/autoResponse/autoResponse";
import { handleMessageXp } from "../modules/leveling/xpManager";
import { translate } from "google-translate-api-x";
import { config } from "../config";

// بسيط تخزين مؤقت للترجمات لتجنب الطلبات المكررة
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

const event: BotEvent = {
  name: "messageCreate",
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;

    // تحقق من أمر الترجمة ,tr
    if (message.content.startsWith(",tr")) {
      const referencedMessage = message.reference?.messageId 
        ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null)
        : null;

      if (!referencedMessage) {
        await message.reply("يجب تحديد رسالة لترجمتها (رد على رسالة واستخدم ,tr)");
        return;
      }

      const text = referencedMessage.content;
      if (!text || text.trim().length === 0) {
        await message.reply("الرسالة المحددة لا تحتوي على نص");
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

        await message.reply({ embeds: [embed] });
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
          await message.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
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

        await message.reply({ embeds: [embed] });
      } catch (error: any) {
        console.error("Translation error:", error);
        await message.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
      }
      return;
    }

    const gConfig = await getGuildConfig(client, message.guild.id);

    // التحقق من القنوات المخصصة
    const customChannels = gConfig.logging?.customChannels;
    console.log("Custom channels config:", JSON.stringify(customChannels));

    const channelId = message.channelId;
    const isTextMessage = !message.attachments.size && !message.stickers.size;
    const isCommand = message.content.startsWith(gConfig.prefix);
    const hasMedia = message.attachments.some(a => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/"));
    const hasStickers = message.stickers.size > 0;

    // إذا الشات مخصص للرسائل - يُسمح فقط بالرسائل النصية
    if (customChannels?.messages?.includes(channelId)) {
      if (!isTextMessage) {
        console.log("Channel is for messages only, deleting non-text content");
        await message.delete().catch(() => null);
        return;
      }
    }

    // إذا الشات مخصص للأوامر - يُسمح فقط بالأوامر
    if (customChannels?.commands?.includes(channelId)) {
      if (!isCommand) {
        console.log("Channel is for commands only, deleting non-command content");
        await message.delete().catch(() => null);
        return;
      }
    }

    // إذا الشات مخصص للصور والفيديوهات - يُسمح فقط بالصور والفيديوهات
    if (customChannels?.media?.includes(channelId)) {
      if (!hasMedia) {
        console.log("Channel is for media only, deleting non-media content");
        await message.delete().catch(() => null);
        return;
      }
    }

    // إذا الشات مخصص للملصقات - يُسمح فقط بالملصقات
    if (customChannels?.stickers?.includes(channelId)) {
      if (!hasStickers) {
        console.log("Channel is for stickers only, deleting non-sticker content");
        await message.delete().catch(() => null);
        return;
      }
    }

    // 1) الرقابة التلقائية أولاً (Auto-Mod)
    const wasActioned = await handleAutoMod(client, message, gConfig);
    if (wasActioned) return;

    // 2) الأوامر (بادئة نصية)
    if (message.content.startsWith(gConfig.prefix)) {
      const withoutPrefix = message.content.slice(gConfig.prefix.length).trim();
      const args = withoutPrefix.split(/\s+/);
      const commandName = args.shift()?.toLowerCase();

      if (commandName) {
        const command =
          client.commands.get(commandName) ??
          client.commands.find(
            (c) =>
              gConfig.commandOverrides?.find((o) => o.name === c.name)?.alias === commandName
          );

        if (command) {
          const override = gConfig.commandOverrides?.find((c) => c.name === command.name);

          if (!override || override.prefixEnabled) {
            const permCheck = checkCommandPermission(override, message.member!, message.channelId);
            if (!permCheck.allowed) {
              await message.reply(permCheck.reason ?? "❌ غير مسموح.");
              return;
            }

            if (override?.customResponse?.enabled) {
              const payload = buildMessageFromCustom(override.customResponse, {
                user: {
                  id: message.author.id,
                  username: message.author.username,
                  tag: message.author.tag,
                  mention: `<@${message.author.id}>`,
                  avatarURL: message.author.displayAvatarURL()
                },
                server: {
                  name: message.guild.name,
                  id: message.guild.id,
                  memberCount: message.guild.memberCount,
                  iconURL: message.guild.iconURL() ?? undefined
                }
              });
              await message.reply(payload as any);
              return;
            }

            const ctx = buildPrefixContext(client, message, args, command);
            await command.run(ctx);
            return;
          }
        }
      }
    }

    // 3) الردود التلقائية
    const responded = await handleAutoResponse(client, message, gConfig);
    if (responded) return;

    // 4) نظام الخبرة (نصي)
    await handleMessageXp(client, message, gConfig);
  }
};

export default event;
