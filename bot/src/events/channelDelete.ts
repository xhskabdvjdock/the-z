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

    await sendLog(
      client,
      channel.guild.id,
      "channelUpdate",
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("➖ تم حذف روم")
        .setDescription(`\`${channel.name}\``)
    );
  }
};

export default event;
