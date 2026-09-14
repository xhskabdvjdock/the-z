import { AuditLogEvent, EmbedBuilder, GuildBasedChannel } from "discord.js";
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

    let executor: any = null;
    try {
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 5 });
      executor = audit.entries.find((e) => (e.target as any)?.id === channel.id && Date.now() - e.createdTimestamp < 10000)?.executor || audit.entries.first()?.executor || null;
    } catch {}

    const channelTypeMap: Record<number, string> = {
      0: "Text",
      2: "Voice",
      4: "Category",
      5: "Announcement",
      13: "Stage",
      15: "Forum"
    };
    const channelType = channelTypeMap[channel.type] || `Type ${channel.type}`;
    const nowUnix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Channel Deleted")
      .addFields(
        { name: "Channel", value: `\`${channel.name}\` (\`${channel.id}\`)`, inline: false },
        { name: "Type", value: channelType, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Unknown (not in audit log)", inline: false },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      )
      .setFooter({ text: `Channel ID: ${channel.id} | Guild: ${channel.guild.name}` })
      .setTimestamp();

    await sendLog(client, channel.guild.id, "channels", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      channelId: channel.id,
      channelName: channel.name,
      details: { type: channelType }
    });
  }
};

export default event;
