import { EmbedBuilder, GuildBasedChannel } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleChannelCreate as antiNukeChannelCreate } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "channelCreate",
  async execute(client, channel: GuildBasedChannel) {
    const gConfig = await getGuildConfig(client, channel.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeChannelCreate(client, channel, gConfig).catch(() => null);
    }

    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 10 }).catch(() => null);
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
      .setColor(0x57f287)
      .setTitle("➕ Channel Created")
      .addFields(
        { name: "Channel", value: `${channel.name} (${channel.id})`, inline: true },
        { name: "Type", value: channelType, inline: true },
        { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setFooter({ text: `Channel ID: ${channel.id}` })
      .setTimestamp();

    await sendLog(client, channel.guild.id, "channels", embed);
  }
};

export default event;
