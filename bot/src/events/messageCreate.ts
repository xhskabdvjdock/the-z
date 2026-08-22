import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { buildPrefixContext } from "../utils/context";
import { checkCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";
import { handleAutoMod } from "../modules/automod/automod";
import { handleAutoResponse } from "../modules/autoResponse/autoResponse";
import { handleMessageXp } from "../modules/leveling/xpManager";
import translate from "translate";
import { config } from "../config";
import { AfkUser, JailUser } from "@thez/shared";

// ضبط المحرك مجاناً
translate.engine = "google";

// بسيط تخزين مؤقت للترجمات لتجنب الطلبات المكررة
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

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

    // إضافة تأخير بسيط لتقليل الضغط على API
    // وهذا مهم خاصة في السيرفرات الكبيرة
    if (Math.random() < 0.1) { // 10% من الرسائل فقط
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // تحقق من أمر الترجمة ,tr
    if (message.content.startsWith(",tr")) {
      const referencedMessage = message.reference?.messageId 
        ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null)
        : null;

      let text = referencedMessage?.content || "";
      
      // إذا لم يكن هناك رد، جلب النص من الرسالة
      if (!text) {
        const args = message.content.slice(3).trim().split(/ +/);
        text = args.join(" ");
      }

      if (!text || text.trim().length === 0) {
        await message.reply("يجب تحديد رسالة لترجمتها (رد على رسالة واستخدم ,tr)");
        return;
      }

      // تحديد لغة النص واللغة المستهدفة
      const isArabic = /[\u0600-\u06FF]/.test(text);
      
      let targetLang: string;

      if (isArabic) {
        targetLang = "en";
      } else {
        targetLang = "ar";
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
        const translatedText = await translate(text, { to: targetLang, from: isArabic ? 'ar' : 'auto' });

        // التحقق من أن الترجمة نجحت
        if (!translatedText || translatedText.trim() === "") {
          await message.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
          return;
        }

        // التأكد من أن النص المترجم لا يتجاوز حد Discord
        const finalText = translatedText.length > 4096 
          ? translatedText.substring(0, 4093) + "..." 
          : translatedText;

        // حفظ في الذاكرة المؤقتة
        translationCache.set(cacheKey, { text: translatedText, timestamp: now });

        const embed = new EmbedBuilder()
          .setColor(config.defaultColor)
          .setDescription(finalText);

        await message.reply({ embeds: [embed] });
      } catch (error: any) {
        console.error("Translation error:", error);
        await message.reply("فشلت الترجمة، يرجى المحاولة مرة أخرى");
      }
      return;
    }

    // Handle prefix commands: afk, avatar, banner
    if (message.content.startsWith(",afk")) {
      const reason = message.content.slice(4).trim() || "No reason provided";
      const guildId = message.guild.id;
      const userId = message.author.id;

      try {
        const existingAfk = await AfkUser.findOne({ guildId, userId });

        if (existingAfk && existingAfk.status) {
          await AfkUser.findOneAndUpdate(
            { guildId, userId },
            { $set: { status: false, mentionCount: 0 } }
          );

          const embed = new EmbedBuilder()
            .setColor(config.defaultColor)
            .setDescription("You are no longer AFK.");

          await message.reply({ embeds: [embed] });
          return;
        }

        const afkData = {
          guildId,
          userId,
          status: true,
          reason,
          mentionCount: 0,
          since: new Date()
        };

        if (existingAfk) {
          await AfkUser.findOneAndUpdate({ guildId, userId }, { $set: afkData });
        } else {
          await AfkUser.create(afkData);
        }

        const embed = new EmbedBuilder()
          .setColor(config.defaultColor)
          .setDescription(`You are now AFK. Reason: ${reason}`);

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Error setting AFK status:", error);
        await message.reply({ content: "Failed to set AFK status. Please try again." });
      }
      return;
    }

    if (message.content.startsWith(",avatar")) {
      const args = message.content.slice(7).trim().split(/\s+/);
      const useServerAvatar = args.includes("server");
      
      let targetMember;
      
      // Check if message mentions a user
      if (message.mentions.users.size > 0) {
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser && !mentionedUser.bot) {
          targetMember = await message.guild.members.fetch(mentionedUser.id).catch(() => null);
        }
      }
      
      // If no mention, try to get from args
      if (!targetMember) {
        const userId = args.find(a => a.match(/^\d+$/));
        if (userId) {
          targetMember = await message.guild.members.fetch(userId).catch(() => null);
        }
      }
      
      // Default to author if no target found
      if (!targetMember) {
        targetMember = message.member;
      }
      
      if (!targetMember) {
        await message.reply({ content: "Could not find that user." });
        return;
      }
      
      let avatarUrl: string;
      let avatarType: string;

      if (useServerAvatar && targetMember.avatar) {
        avatarUrl = targetMember.avatarURL({ size: 4096 }) || targetMember.user.displayAvatarURL({ size: 4096 });
        avatarType = "Server Avatar";
      } else {
        avatarUrl = targetMember.user.displayAvatarURL({ size: 4096 });
        avatarType = "Global Avatar";
      }

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle(`${targetMember.user.tag}'s ${avatarType}`)
        .setImage(avatarUrl);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel("Download")
            .setStyle(ButtonStyle.Link)
            .setURL(avatarUrl),
          new ButtonBuilder()
            .setLabel("Open in Browser")
            .setStyle(ButtonStyle.Link)
            .setURL(avatarUrl)
        );

      await message.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (message.content.startsWith(",banner")) {
      const args = message.content.slice(7).trim().split(/\s+/);
      const useServerBanner = args.includes("server");
      const userId = args.find(a => a.match(/^\d+$/)) || message.author.id;
      
      const targetMember = await message.guild.members.fetch(userId).catch(() => null);
      if (!targetMember) {
        await message.reply({ content: "Could not find that user." });
        return;
      }
      
      let bannerUrl: string | null;
      let bannerType: string;

      if (useServerBanner) {
        bannerUrl = targetMember.guild.bannerURL({ size: 4096 });
        bannerType = "Server Banner";
      } else {
        const fullUser = await message.client.users.fetch(targetMember.user.id, { force: true }).catch(() => null);
        bannerUrl = fullUser?.bannerURL({ size: 4096 }) ?? null;
        bannerType = "Profile Banner";
      }

      if (!bannerUrl) {
        await message.reply({ content: "This user does not have a banner." });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle(`${targetMember.user.tag}'s ${bannerType}`)
        .setImage(bannerUrl);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel("Download")
            .setStyle(ButtonStyle.Link)
            .setURL(bannerUrl),
          new ButtonBuilder()
            .setLabel("Open in Browser")
            .setStyle(ButtonStyle.Link)
            .setURL(bannerUrl)
        );

      await message.reply({ embeds: [embed], components: [row] });
      return;
    }

    // Handle jail command
    if (message.content.startsWith(",jail")) {
      const args = message.content.slice(5).trim().split(/\s+/);
      const targetId = args[0]?.replace(/[<@!>]/g, "");
      
      if (!targetId) {
        await message.reply("Please specify a user to jail.");
        return;
      }

      const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
      if (!targetMember) {
        await message.reply("User not found.");
        return;
      }

      // Check if user is admin
      if (!message.member?.permissions.has("Administrator")) {
        await message.reply("Only administrators can use this command.");
        return;
      }

      // Check if target is admin
      if (targetMember.permissions.has("Administrator")) {
        await message.reply("Cannot jail administrators.");
        return;
      }

      const gConfig = await getGuildConfig(client, targetMember.guild.id);
      if (!gConfig.jail?.enabled || !gConfig.jail.roleId) {
        await message.reply("Jail system is not configured.");
        return;
      }

      const jailRole = targetMember.guild.roles.cache.get(gConfig.jail.roleId);
      if (!jailRole) {
        await message.reply("Jail role not found.");
        return;
      }

      // Check if already jailed
      const existingJail = await JailUser.findOne({ userId: targetId, guildId: targetMember.guild.id });
      if (existingJail) {
        await message.reply("User is already jailed.");
        return;
      }

      // Store current roles
      const currentRoles = targetMember.roles.cache
        .filter(r => r.id !== targetMember.guild.id && !gConfig.jail.removeRoles.includes(r.id))
        .map(r => r.id);

      // Remove specified roles
      const rolesToRemove = targetMember.roles.cache.filter(r => gConfig.jail.removeRoles.includes(r.id));
      if (rolesToRemove.size > 0) {
        await targetMember.roles.remove(rolesToRemove).catch(() => null);
      }

      // Give jail role
      await targetMember.roles.add(jailRole).catch(() => null);

      // Save to database
      await JailUser.create({
        userId: targetId,
        guildId: targetMember.guild.id,
        originalRoles: currentRoles,
        jailedBy: message.author.id,
        jailedAt: new Date()
      });

      await message.reply(`Successfully jailed ${targetMember.user.tag}.`);
      return;
    }

    // Handle unjail command
    if (message.content.startsWith(",unjail")) {
      const args = message.content.slice(7).trim().split(/\s+/);
      const targetId = args[0]?.replace(/[<@!>]/g, "");
      
      if (!targetId) {
        await message.reply("Please specify a user to unjail.");
        return;
      }

      const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
      if (!targetMember) {
        await message.reply("User not found.");
        return;
      }

      // Check if user is admin
      if (!message.member?.permissions.has("Administrator")) {
        await message.reply("Only administrators can use this command.");
        return;
      }

      const gConfig = await getGuildConfig(client, targetMember.guild.id);
      if (!gConfig.jail?.enabled || !gConfig.jail.roleId) {
        await message.reply("Jail system is not configured.");
        return;
      }

      const jailRole = targetMember.guild.roles.cache.get(gConfig.jail.roleId);
      if (!jailRole) {
        await message.reply("Jail role not found.");
        return;
      }

      // Check if jailed
      const jailRecord = await JailUser.findOne({ userId: targetId, guildId: targetMember.guild.id });
      if (!jailRecord) {
        await message.reply("User is not jailed.");
        return;
      }

      // Remove jail role
      await targetMember.roles.remove(jailRole).catch(() => null);

      // Restore original roles
      for (const roleId of jailRecord.originalRoles) {
        const role = targetMember.guild.roles.cache.get(roleId);
        if (role) {
          await targetMember.roles.add(role).catch(() => null);
        }
      }

      // Delete jail record
      await JailUser.deleteOne({ userId: targetId, guildId: targetMember.guild.id });

      await message.reply(`Successfully unjailed ${targetMember.user.tag}.`);
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

    // 4) نظام AFK
    // Check if mentioned users are AFK
    const mentionedUsers = message.mentions.users.filter(u => !u.bot);
    for (const [userId, user] of mentionedUsers) {
      const afkUser = await AfkUser.findOne({ guildId: message.guild.id, userId });
      if (afkUser && afkUser.status) {
        // Increment mention count
        await AfkUser.updateOne(
          { guildId: message.guild.id, userId },
          { $inc: { mentionCount: 1 } }
        );

        // Send AFK message
        await message.reply(`User ${user.tag} is currently AFK. Reason: ${afkUser.reason || "No reason provided"}`);
      }
    }

    // Check if message author is AFK and coming back
    const authorAfk = await AfkUser.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (authorAfk && authorAfk.status) {
      // Remove AFK status
      await AfkUser.updateOne(
        { guildId: message.guild.id, userId: message.author.id },
        { $set: { status: false, mentionCount: 0 } }
      );

      // Send welcome back message
      await message.reply(`Welcome back! You have ${authorAfk.mentionCount} unread mentions while you were away.`);
    }

    // 5) نظام الخبرة (نصي)
    await handleMessageXp(client, message, gConfig);
  }
};

export default event;
