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

    await sendLog(
      client,
      channel.guild.id,
      "channelUpdate",
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("➕ تم إنشاء روم جديد")
        .setDescription(`${channel} (\`${channel.name}\`)`)
    );
  }
};

export default event;
