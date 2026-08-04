import { EmbedBuilder, GuildBasedChannel } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleChannelDelete as antiNukeChannelDelete } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "channelDelete",
  async execute(client, channel: GuildBasedChannel) {
    const gConfig = await getGuildConfig(client, channel.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeChannelDelete(client, channel, gConfig).catch(() => null);
    }

    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }).catch(() => null);
    const executor = auditLogs?.entries.first()?.executor;

    const channelTypeMap: Record<number, string> = {
      0: "Text",
      2: "Voice",
      4: "Category",
      5: "Announcement",
      13: "Stage",
      15: "Forum"
    };

    const channelType = channelTypeMap[channel.type] || "Unknown";

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Channel Deleted")
      .addFields(
        { name: "Channel", value: `${channel.name} (${channel.id})`, inline: true },
        { name: "Type", value: channelType, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setFooter({ text: `Channel ID: ${channel.id}` })
      .setTimestamp();

    await sendLog(client, channel.guild.id, "channels", embed);
  }
};

export default event;
