import { EmbedBuilder, Message } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { buildPrefixContext } from "../utils/context";
import { checkCommandPermission, verifyCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";
import { handleAutoMod } from "../modules/automod/automod";
import { handleAutoResponse } from "../modules/autoResponse/autoResponse";
import { handleMessageXp } from "../modules/leveling/xpManager";
import { handleLegacyPrefixCommands } from "../handlers/legacyPrefixHandler";
import { handleSuggestionMessage } from "../modules/suggestions/suggestionListener";
import { handleMovieMessage } from "../modules/movies/movieListener";
import { checkCommandCooldown, applyCommandCooldown } from "../utils/cooldown";
import { sendMediaLog } from "../modules/logging/logger";
import { handleGifBlock } from "../modules/gifBlock/gifBlock";
import { buildMessageContext } from "../utils/messageContext";
import { recordAfkMention } from "../utils/afkBatch";
import { recordCommandRun, recordDbRead, recordDbWrite, recordMessageProcessed } from "../utils/metrics";
import { AfkUser } from "@thez/shared";

// نظام بسيط لتقليل rate limits من خلال تأخير الردود
const messageQueue = new Map<string, number>();
const QUEUE_DELAY = 200; // 200ms بين الردود في نفس الروم

/** دالة مساعدة لتأخير الردود لتقليل rate limits */
async function queueReply(channelId: string, replyFn: () => Promise<any>) {
  const lastReply = messageQueue.get(channelId) || 0;
  const now = Date.now();
  const timeSinceLastReply = now - lastReply;

  if (timeSinceLastReply < QUEUE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY - timeSinceLastReply));
  }

  messageQueue.set(channelId, Date.now());
  return await replyFn();
}

const event: BotEvent = {
  name: "messageCreate",
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;
    const startedAt = Date.now();

    // إضافة تأخير بسيط لتقليل الضغط على API
    // وهذا مهم خاصة في السيرفرات الكبيرة
    if (Math.random() < 0.1) { // 10% من الرسائل فقط
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 1) أوامر البادئة الثابتة (,tr | ,afk | ,avatar | ,banner | ,jail | ,unjail)
    const wasLegacy = await handleLegacyPrefixCommands(client, message);
    if (wasLegacy) return;

    // جلب واحد للإعدادات المكشّنة — يُمرَّر لكل الأنظمة بالمرجع (لا تكرار)
    const gConfig = await getGuildConfig(client, message.guild.id);
    const msgCtx = buildMessageContext(client, message, gConfig);
    if (!msgCtx) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 1.5) نظام الاقتراحات — تحويل رسائل قناة الاقتراحات إلى صور
    const wasSuggestion = await handleSuggestionMessage(message, gConfig);
    if (wasSuggestion) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 1.6) نظام الأفلام — البحث في قناة الأفلام
    const wasMovie = await handleMovieMessage(message, gConfig);
    if (wasMovie) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 1.6) التحقق من حظر GIFs
    const wasGifBlocked = await handleGifBlock(client, message, gConfig);
    if (wasGifBlocked) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 2) القنوات المخصصة لنوع معين من المحتوى
    const customChannels = gConfig.logging?.customChannels;
    const channelId = message.channelId;
    const isCommand = message.content.startsWith(gConfig.prefix);
    const isTextOnly = !message.attachments.size && !message.stickers.size;
    const hasMedia = message.attachments.some(
      (a) => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/")
    );
    const hasStickers = message.stickers.size > 0;

    if (customChannels?.messages?.includes(channelId) && !isTextOnly) {
      await message.delete().catch(() => null);
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }
    if (customChannels?.commands?.includes(channelId) && !isCommand) {
      await message.delete().catch(() => null);
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }
    if (customChannels?.media?.includes(channelId) && !hasMedia) {
      await message.delete().catch(() => null);
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }
    if (customChannels?.stickers?.includes(channelId) && !hasStickers) {
      await message.delete().catch(() => null);
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 3) الرقابة التلقائية
    const wasActioned = await handleAutoMod(client, msgCtx.message, msgCtx.guildConfig);
    if (wasActioned) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 4) أوامر بادئة السيرفر (مع دعم البادئة المخصصة لكل أمر)
    const overrideMap = new Map((gConfig.commandOverrides ?? []).map((o) => [o.name, o]));
    const globalPrefix = gConfig.prefix;

    const allPrefixes = new Set<string>([globalPrefix]);
    for (const o of gConfig.commandOverrides ?? []) {
      if (o.customPrefix) allPrefixes.add(o.customPrefix);
    }

    const matchedPrefix = [...allPrefixes]
      .sort((a, b) => b.length - a.length)
      .find((p) => message.content.startsWith(p));

    if (matchedPrefix) {
      const parts = message.content.slice(matchedPrefix.length).trim().split(/\s+/);
      const commandName = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      if (commandName) {
        const command =
          client.commands.get(commandName) ??
          client.commands.find((c) => overrideMap.get(c.name)?.alias === commandName);

        if (command) {
          const override = overrideMap.get(command.name);
          const effectivePrefix = override?.customPrefix || globalPrefix;

          if (effectivePrefix === matchedPrefix && (!override || override.enabled !== false)) {
            // 4.1) صلاحيات Discord الأساسية (defaultMemberPermissions) — نفس التطبيق الذي
            // يفرض Discord على الـSlash، مطبّق يدويًا هنا للبادئة (لا يفرضه Discord تلقائيًا)
            const discordPerm = verifyCommandPermission(command, message.member!, message.channel);
            if (!discordPerm.allowed) {
              await message.reply(discordPerm.reason ?? "لا تملك الصلاحيات الكافية.");
              recordMessageProcessed(Date.now() - startedAt);
              return;
            }

            // 4.2) تخصيصات لوحة التحكم (Command Overrides) — نظام موجود لا يتغير
            const permCheck = checkCommandPermission(override, message.member!, message.channelId);
            if (!permCheck.allowed) {
              await message.reply(permCheck.reason ?? "غير مسموح.");
              recordMessageProcessed(Date.now() - startedAt);
              return;
            }

            // 4.3) البرودة (Cooldown) — مدة الأمر نفسه أو override أو صفر (بدون برودة)
            const cdCheck = checkCommandCooldown(
              client,
              command,
              message.guild.id,
              message.author.id,
              override
            );
            if (!cdCheck.allowed) {
              await message.reply(
                `⏳ هذا الأمر قيد البرودة — انتظر ${cdCheck.remainingSeconds} ثانية تقريبًا.`
              );
              recordMessageProcessed(Date.now() - startedAt);
              return;
            }
            applyCommandCooldown(client, command, message.guild.id, message.author.id, override);

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
              recordMessageProcessed(Date.now() - startedAt);
              return;
            }

            const ctx = buildPrefixContext(client, message, args, command);
            recordCommandRun();
            await command.run(ctx);
            recordMessageProcessed(Date.now() - startedAt);
            return;
          }
        }
      }
    }

    // 5) الردود التلقائية
    const responded = await handleAutoResponse(client, msgCtx.message, msgCtx.guildConfig);
    if (responded) {
      recordMessageProcessed(Date.now() - startedAt);
      return;
    }

    // 6) نظام AFK — قراءة واحدة، وعدّادات المنشن متراكمة تُحفَظ دفعيًا (لا N×update)
    const mentionedUsers = msgCtx.message.mentions.users.filter((u) => !u.bot);
    if (mentionedUsers.size > 0) {
      const userIds = [...mentionedUsers.keys()];
      recordDbRead();
      const afkUsers = await AfkUser.find({
        guildId: msgCtx.guildId,
        userId: { $in: userIds },
        status: true
      });

      if (afkUsers.length > 0) {
        const afkMap = new Map(afkUsers.map((a) => [a.userId, a]));
        for (const [userId, user] of mentionedUsers) {
          const afkData = afkMap.get(userId);
          if (afkData) {
            recordAfkMention(msgCtx.guildId, userId);
            await msgCtx.message
              .reply(`User ${user.tag} is currently AFK. Reason: ${afkData.reason || "No reason provided"}`)
              .catch(() => null);
          }
        }
      }
    }

    const authorAfk = await AfkUser.findOne({
      guildId: msgCtx.guildId,
      userId: msgCtx.user.id,
      status: true
    });
    recordDbRead();
    if (authorAfk) {
      recordDbWrite();
      await AfkUser.updateOne(
        { guildId: msgCtx.guildId, userId: msgCtx.user.id },
        { $set: { status: false, mentionCount: 0 } }
      );
      await msgCtx.message
        .reply(`Welcome back! You have ${authorAfk.mentionCount} unread mentions while you were away.`)
        .catch(() => null);
    }

    // 7) نظام الخبرة — تراكم في الذاكرة فقط
    await handleMessageXp(client, msgCtx.message, msgCtx.guildConfig);

    // 8) تسجيل المرفقات المرسلة (صور/فيديوهات/ملفات) — يُرسل الملف نفسه لروم اللوق
    if (message.attachments.size > 0) {
      const media = [...message.attachments.values()].map((a) => ({
        url: a.proxyURL || a.url,
        name: a.name,
        contentType: a.contentType,
        size: a.size
      }));

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("📎 ملف جديد")
        .setDescription(`بواسطة ${message.author.tag} \`${message.author.id}\``)
        .addFields({
          name: "القناة",
          value: `<#${message.channelId}> \`${message.channelId}\``,
          inline: true
        });

      if (message.content) {
        embed.addFields({
          name: "النص",
          value: message.content.length > 1000 ? message.content.slice(0, 997) + "..." : message.content
        });
      }

      embed.setFooter({ text: `Message ID: ${message.id}` });
      await sendMediaLog(client, message.guild.id, "files", embed, media);
    }

    recordMessageProcessed(Date.now() - startedAt);
  }
};

export default event;