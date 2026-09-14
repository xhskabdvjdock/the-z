import { AuditLogEvent, EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog, sendMediaLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageDelete",
  async execute(client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    let executor: any = null;
    try {
      const audit = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 8 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === message.author?.id && Date.now() - e.createdTimestamp < 10000) as any;
      // Also try matching by channel extra
      const byChannel = audit.entries.find((e) => e.extra?.channel?.id === message.channelId && Date.now() - e.createdTimestamp < 10000);
      executor = entry?.executor || byChannel?.executor || null;
    } catch {}

    const channel = message.channel as any;
    const channelName = channel?.name || "Unknown";
    const nowUnix = Math.floor(Date.now() / 1000);
    const messageUrl = `https://discord.com/channels/${message.guild.id}/${message.channelId}/${message.id}`;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Message Deleted")
      .addFields(
        { name: "Author", value: `${message.author?.tag || "Unknown"} <@${message.author?.id || "Unknown"}> (\`${message.author?.id || "Unknown"}\`)`, inline: false },
        { name: "Channel", value: `<#${message.channelId}> \`${channelName}\` (\`${message.channelId}\`)`, inline: false },
        { name: "Deleted By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Author or Unknown", inline: false },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      );

    if (message.content) {
      const truncatedContent = message.content.length > 1000 ? message.content.slice(0, 997) + "..." : message.content;
      embed.addFields({ name: "Message Content", value: truncatedContent.slice(0, 1024) || "No content" });
    } else {
      embed.addFields({ name: "Message Content", value: "No text content (may contain image/file)" });
    }

    const attachments = message.attachments?.size ? [...message.attachments.values()] : [];
    if (attachments.length > 0) {
      const attachmentNames = attachments.map((a) => `${a.name} (\`${a.size} bytes\`)`).join(", ");
      embed.addFields({ name: "Attachments", value: attachmentNames.slice(0, 1024), inline: false });
    }

    embed.setFooter({ text: `Message ID: ${message.id} | Author ID: ${message.author?.id || "Unknown"}` }).setTimestamp();

    const logOptions = {
      executorId: executor?.id,
      executorTag: executor?.tag,
      targetId: message.author?.id,
      targetTag: message.author?.tag,
      channelId: message.channelId,
      channelName,
      messageId: message.id,
      messageUrl,
      before: message.content || null,
      details: { attachments: attachments.map((a) => ({ name: a.name, url: a.url, size: a.size, contentType: a.contentType })) }
    };

    if (attachments.length > 0) {
      await sendMediaLog(
        client,
        message.guild.id,
        "messages",
        embed,
        attachments.map((a) => ({
          url: a.proxyURL || a.url,
          name: a.name,
          contentType: a.contentType,
          size: a.size
        })),
        undefined,
        logOptions
      );
    } else {
      await sendLog(client, message.guild.id, "messages", embed, undefined, logOptions);
    }
  }
};

export default event;
