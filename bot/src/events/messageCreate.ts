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
import { handleGamePrefix } from "../games";
import { checkCommandCooldown, applyCommandCooldown } from "../utils/cooldown";
import { sendMediaLog } from "../modules/logging/logger";
import { AfkUser } from "@thez/shared";

const event: BotEvent = {
  name: "messageCreate",
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;

    // 1) أوامر البادئة الثابتة (,tr | ,afk | ,avatar | ,banner | ,jail | ,unjail)
    const wasLegacy = await handleLegacyPrefixCommands(client, message);
    if (wasLegacy) return;

    const gConfig = await getGuildConfig(client, message.guild.id);

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
      return;
    }
    if (customChannels?.commands?.includes(channelId) && !isCommand) {
      await message.delete().catch(() => null);
      return;
    }
    if (customChannels?.media?.includes(channelId) && !hasMedia) {
      await message.delete().catch(() => null);
      return;
    }
    if (customChannels?.stickers?.includes(channelId) && !hasStickers) {
      await message.delete().catch(() => null);
      return;
    }

    // 3) ألعاب The Z — أوامر البادئة الخاصة بالألعاب (-xo، -mafia، -join ...)
    const wasGame = await handleGamePrefix(client, message, gConfig.prefix, gConfig.games);
    if (wasGame) return;

    // 4) الرقابة التلقائية
    const wasActioned = await handleAutoMod(client, message, gConfig);
    if (wasActioned) return;

    // 5) أوامر بادئة السيرفر (مع دعم البادئة المخصصة لكل أمر)
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

          if (effectivePrefix === matchedPrefix && (!override || override.prefixEnabled)) {
            // 4.1) صلاحيات Discord الأساسية (defaultMemberPermissions) — نفس التطبيق الذي
            // يفرض Discord على الـSlash، مطبّق يدويًا هنا للبادئة (لا يفرضه Discord تلقائيًا)
            const discordPerm = verifyCommandPermission(command, message.member!, message.channel);
            if (!discordPerm.allowed) {
              await message.reply(discordPerm.reason ?? "❌ لا تملك الصلاحيات الكافية.");
              return;
            }

            // 4.2) تخصيصات لوحة التحكم (Command Overrides) — نظام موجود لا يتغير
            const permCheck = checkCommandPermission(override, message.member!, message.channelId);
            if (!permCheck.allowed) {
              await message.reply(permCheck.reason ?? "❌ غير مسموح.");
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
              return;
            }

            const ctx = buildPrefixContext(client, message, args, command);
            await command.run(ctx);
            return;
          }
        }
      }
    }

    // 6) الردود التلقائية
    const responded = await handleAutoResponse(client, message, gConfig);
    if (responded) return;

    // 7) نظام AFK — batch queries بدلاً من N+1
    const mentionedUsers = message.mentions.users.filter((u) => !u.bot);
    if (mentionedUsers.size > 0) {
      const userIds = [...mentionedUsers.keys()];
      const afkUsers = await AfkUser.find({
        guildId: message.guild.id,
        userId: { $in: userIds },
        status: true
      });

      if (afkUsers.length > 0) {
        // updateMany غير متاح على نوع هذا الموديل — نستخدم updateOne متوازية
        await Promise.all(
          afkUsers.map((a) =>
            AfkUser.updateOne(
              { guildId: message.guild!.id, userId: a.userId },
              { $inc: { mentionCount: 1 } }
            )
          )
        );
        const afkMap = new Map(afkUsers.map((a) => [a.userId, a]));
        for (const [userId, user] of mentionedUsers) {
          const afkData = afkMap.get(userId);
          if (afkData) {
            await message
              .reply(`User ${user.tag} is currently AFK. Reason: ${afkData.reason || "No reason provided"}`)
              .catch(() => null);
          }
        }
      }
    }

    const authorAfk = await AfkUser.findOne({
      guildId: message.guild.id,
      userId: message.author.id,
      status: true
    });
    if (authorAfk) {
      await AfkUser.updateOne(
        { guildId: message.guild.id, userId: message.author.id },
        { $set: { status: false, mentionCount: 0 } }
      );
      await message
        .reply(`Welcome back! You have ${authorAfk.mentionCount} unread mentions while you were away.`)
        .catch(() => null);
    }

    // 8) نظام الخبرة
    await handleMessageXp(client, message, gConfig);

    // 9) تسجيل المرفقات المرسلة (صور/فيديوهات/ملفات) — يُرسل الملف نفسه لروم اللوق
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
  }
};

export default event;
