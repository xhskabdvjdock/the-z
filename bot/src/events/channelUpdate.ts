import { EmbedBuilder, Channel } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "channelUpdate",
  async execute(client, oldChannel: Channel, newChannel: Channel) {
    if (!("guild" in newChannel) || !newChannel.guild) return;

    const changes: string[] = [];

    // Name change
    if ("name" in oldChannel && "name" in newChannel && oldChannel.name !== newChannel.name) {
      changes.push(`Name: ${oldChannel.name} → ${newChannel.name}`);
    }

    // Topic change (for text channels)
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push(`Topic: ${oldChannel.topic || "None"} → ${newChannel.topic || "None"}`);
    }

    // Slowmode change (for text channels)
    if ("rateLimitPerUser" in oldChannel && "rateLimitPerUser" in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`Slowmode: ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
    }

    // NSFW change
    if ("nsfw" in oldChannel && "nsfw" in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`NSFW: ${oldChannel.nsfw ? "Yes" : "No"} → ${newChannel.nsfw ? "Yes" : "No"}`);
    }

    if (changes.length === 0) return;

    const channelName = "name" in newChannel ? newChannel.name : "Unknown";

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Channel Updated")
      .addFields(
        { name: "Channel", value: `${channelName} (${newChannel.id})`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `Channel ID: ${newChannel.id}` });
    embed.setTimestamp();

    await sendLog(client, newChannel.guild.id, "channels", embed);
  }
};

export default event;
