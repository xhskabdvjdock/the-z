import { Message } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { buildPrefixContext } from "../utils/context";
import { checkCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";
import { handleAutoMod } from "../modules/automod/automod";
import { handleAutoResponse } from "../modules/autoResponse/autoResponse";
import { handleMessageXp } from "../modules/leveling/xpManager";

const event: BotEvent = {
  name: "messageCreate",
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;

    const gConfig = await getGuildConfig(client, message.guild.id);

    // التحقق من القنوات المخصصة
    const customChannels = gConfig.logging?.customChannels;

    // التحقق من الرسائل النصية
    if (customChannels?.messages && customChannels.messages.length > 0) {
      const isTextMessage = !message.attachments.size && !message.stickers.size;
      if (isTextMessage && !customChannels.messages.includes(message.channelId)) {
        return;
      }
    }

    // التحقق من الأوامر
    if (customChannels?.commands && customChannels.commands.length > 0) {
      const isCommand = message.content.startsWith(gConfig.prefix);
      if (isCommand && !customChannels.commands.includes(message.channelId)) {
        return;
      }
    }

    // التحقق من الصور والفيديوهات
    if (customChannels?.media && customChannels.media.length > 0) {
      const hasMedia = message.attachments.some(a => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/"));
      if (hasMedia && !customChannels.media.includes(message.channelId)) {
        await message.delete().catch(() => null);
        return;
      }
    }

    // التحقق من الملصقات
    if (customChannels?.stickers && customChannels.stickers.length > 0) {
      const hasStickers = message.stickers.size > 0;
      if (hasStickers && !customChannels.stickers.includes(message.channelId)) {
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
