import { EmbedBuilder, GuildBan } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleBanAdd as antiNukeBanAdd } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "guildBanAdd",
  async execute(client, ban: GuildBan) {
    const gConfig = await getGuildConfig(client, ban.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeBanAdd(client, ban.guild, ban.user, gConfig).catch(() => null);
    }

    await sendLog(
      client,
      ban.guild.id,
      "moderation",
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔨 تم حظر عضو")
        .setDescription(`${ban.user.tag} (\`${ban.user.id}\`)`)
    );
  }
};

export default event;
