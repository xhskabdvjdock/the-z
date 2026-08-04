import { EmbedBuilder, Message, PartialMessage } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageUpdate",
  async execute(
    client,
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Message Edited")
      .addFields(
        { name: "Author", value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: "Channel", value: `${newMessage.channelId}`, inline: true }
      );

    if (oldMessage.content) {
      const oldContent = oldMessage.content.length > 1024 ? oldMessage.content.slice(0, 1021) + "..." : oldMessage.content;
      embed.addFields({ name: "Old Content", value: oldContent });
    }

    if (newMessage.content) {
      const newContent = newMessage.content.length > 1024 ? newMessage.content.slice(0, 1021) + "..." : newMessage.content;
      embed.addFields({ name: "New Content", value: newContent });
    }

    embed.setFooter({ text: `Message ID: ${newMessage.id} | Author ID: ${newMessage.author.id}` });
    embed.setTimestamp();

    await sendLog(client, newMessage.guild.id, "messages", embed);
  }
};

export default event;
