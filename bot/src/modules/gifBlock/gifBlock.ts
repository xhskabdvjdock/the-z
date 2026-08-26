import { Message, GuildMember, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { GifBlock } from "@thez/shared";
import { sendLog } from "../logging/logger";

export async function handleGifBlock(client: ExtendedClient, message: Message): Promise<boolean> {
  if (!message.guild) return false;

  const gConfig = await getGuildConfig(client, message.guild.id);
  if (!gConfig.gifBlock?.enabled) return false;

  // Check if user or channel is whitelisted
  const member = message.member as GuildMember;
  if (member && gConfig.gifBlock.whitelistRoleIds.some(roleId => member.roles.cache.has(roleId))) {
    return false;
  }
  if (gConfig.gifBlock.whitelistChannelIds.includes(message.channelId)) {
    return false;
  }

  // Get all enabled GIF blocks for this guild
  const gifBlocks = await GifBlock.find({ guildId: message.guild.id, enabled: true });
  if (gifBlocks.length === 0) return false;

  // Check message content for blocked GIF URLs
  const messageContent = message.content.toLowerCase();
  let blockedGif = null;

  for (const block of gifBlocks) {
    if (messageContent.includes(block.url.toLowerCase())) {
      blockedGif = block;
      break;
    }
  }

  if (!blockedGif) return false;

  // Log the action
  const embed = new EmbedBuilder()
    .setTitle("حظر GIF")
    .setColor(0xff6b6b)
    .setDescription(`تم حذف رابط GIF محظور`)
    .addFields(
      { name: "المستخدم", value: `${member.user.tag} (${member.id})` },
      { name: "الرابط المحظور", value: blockedGif.url },
      { name: "الإجراء", value: blockedGif.action },
      { name: "القناة", value: `<#${message.channelId}>` }
    )
    .setTimestamp();

  await sendLog(client, message.guild.id, "gifblock", embed, undefined, {
    executorId: client.user?.id,
    executorTag: client.user?.tag,
    targetId: message.author.id,
    targetTag: message.author.tag,
    reason: blockedGif.reason,
    channelId: message.channelId,
    channelName: ('name' in message.channel ? message.channel.name : undefined) || undefined,
    details: {
      blockedUrl: blockedGif.url,
      action: blockedGif.action
    }
  });

  // Apply the configured action
  await applyGifBlockAction(client, message, blockedGif, gConfig.gifBlock.logChannelId);

  return true;
}

async function applyGifBlockAction(
  client: ExtendedClient,
  message: Message,
  block: any,
  logChannelId?: string
): Promise<void> {
  const member = message.member as GuildMember;
  if (!member) return;

  // Apply the action
  switch (block.action) {
    case "delete":
      await message.delete().catch(() => {});
      // لا نرسل رسالة إشعار عند الحذف فقط
      break;

    case "warn":
      await message.delete().catch(() => {});
      // You could integrate with your warning system here
      break;

    case "mute":
      await message.delete().catch(() => {});
      const muteDuration = block.duration || 10; // default 10 minutes
      // You would need to integrate with your mute system
      break;

    case "kick":
      await message.delete().catch(() => {});
      await member.kick("إرسال GIF محظور").catch(() => {});
      break;

    case "ban":
      await message.delete().catch(() => {});
      await member.ban({ reason: "إرسال GIF محظور" }).catch(() => {});
      break;
  }

  // Send notification message (only for actions other than delete)
  if (block.action !== "delete" && message.channel.isTextBased() && 'send' in message.channel) {
    const notification = getActionNotification(block.action, member, block.duration);
    await message.channel.send({ content: notification }).catch(() => {});
  }
}

function getActionNotification(action: string, member: GuildMember, duration?: number): string {
  switch (action) {
    case "delete":
      return `${member}، تم حذف رابط GIF المحظور`;
    case "warn":
      return `${member}، تم تحذيرك بسبب إرسال GIF محظور`;
    case "mute":
      return `${member}، تم كتمك لمدة ${duration || 10} دقيقة بسبب إرسال GIF محظور`;
    case "kick":
      return `${member.user.tag}، تم طردك بسبب إرسال GIF محظور`;
    case "ban":
      return `🔨 ${member.user.tag}، تم حظرك بسبب إرسال GIF محظور`;
    default:
      return `🚫 ${member}، تم اتخاذ إجراء بسبب إرسال GIF محظور`;
  }
}