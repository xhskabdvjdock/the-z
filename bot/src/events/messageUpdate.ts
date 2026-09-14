import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageUpdate",
  async execute(client, oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const channel = newMessage.channel as any;
    const channelName = channel?.name || "Unknown";
    const nowUnix = Math.floor(Date.now() / 1000);
    const messageUrl = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channelId}/${newMessage.id}`;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Message Edited")
      .addFields(
        { name: "Author", value: `${newMessage.author.tag} <@${newMessage.author.id}> (\`${newMessage.author.id}\`)`, inline: false },
        { name: "Channel", value: `<#${newMessage.channelId}> \`${channelName}\` (\`${newMessage.channelId}\`)`, inline: false },
        { name: "Message Link", value: `[Jump to message](${messageUrl})`, inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );

    if (oldMessage.content) {
      const oldContent = oldMessage.content.length > 1024 ? oldMessage.content.slice(0, 1021) + "..." : oldMessage.content;
      embed.addFields({ name: "Old Content", value: oldContent || "Empty" });
    } else {
      embed.addFields({ name: "Old Content", value: "Unknown (not cached)" });
    }
    if (newMessage.content) {
      const newContent = newMessage.content.length > 1024 ? newMessage.content.slice(0, 1021) + "..." : newMessage.content;
      embed.addFields({ name: "New Content", value: newContent || "Empty" });
    }

    embed.setFooter({ text: `Message ID: ${newMessage.id} | Author ID: ${newMessage.author.id}` }).setTimestamp();

    await sendLog(client, newMessage.guild.id, "messages", embed, undefined, {
      executorId: newMessage.author.id,
      executorTag: newMessage.author.tag,
      targetId: newMessage.author.id,
      targetTag: newMessage.author.tag,
      channelId: newMessage.channelId,
      channelName,
      messageId: newMessage.id,
      messageUrl,
      before: oldMessage.content || null,
      after: newMessage.content || null
    });
  }
};

export default event;
