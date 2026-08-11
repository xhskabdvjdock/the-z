import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog, sendMediaLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageDelete",
  async execute(client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🗑️ Message Deleted")
      .addFields(
        { name: "Author", value: `${message.author?.tag || "Unknown"} (${message.author?.id || "Unknown"})`, inline: true },
        { name: "Channel", value: `${message.channelId}`, inline: true }
      );

    if (message.content) {
      const truncatedContent = message.content.length > 1000 ? message.content.slice(0, 997) + "..." : message.content;
      embed.addFields({ name: "Message Content", value: truncatedContent });
    } else {
      embed.addFields({ name: "Message Content", value: "No text content (may contain image/file)" });
    }

    const attachments = message.attachments?.size ? [...message.attachments.values()] : [];

    if (attachments.length > 0) {
      const attachmentNames = attachments.map(a => a.name).join(", ");
      embed.addFields({ name: "Attachments", value: attachmentNames, inline: true });
    }

    embed.setFooter({ text: `Message ID: ${message.id} | Author ID: ${message.author?.id || "Unknown"}` });
    embed.setTimestamp();

    // إن كان للمحذوفة مرفقات نعرفها (رسالة مخزنة في الكاش) نرسل الملفات نفسها
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
        }))
      );
    } else {
      await sendLog(client, message.guild.id, "messages", embed);
    }
  }
};

export default event;
