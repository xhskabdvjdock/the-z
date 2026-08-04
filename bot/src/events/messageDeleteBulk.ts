import { EmbedBuilder, Collection, Message } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageDeleteBulk",
  async execute(client, messages: Collection<string, Message>) {
    const firstMessage = messages.first();
    if (!firstMessage?.guild) return;

    const guild = firstMessage.guild;
    const channelId = firstMessage.channelId;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Messages Bulk Deleted")
      .addFields(
        { name: "Channel", value: `${channelId}`, inline: true },
        { name: "Messages Deleted", value: `${messages.size}`, inline: true }
      );

    // Show a sample of deleted messages
    const sampleMessages = messages
      .filter(m => m.content && !m.author.bot)
      .map(m => `${m.author.tag}: ${m.content.slice(0, 100)}`)
      .slice(0, 5)
      .join("\n");

    if (sampleMessages) {
      embed.addFields({ name: "Sample Messages", value: sampleMessages || "No text content" });
    }

    embed.setFooter({ text: `Channel ID: ${channelId}` });
    embed.setTimestamp();

    await sendLog(client, guild.id, "messages", embed);
  }
};

export default event;
