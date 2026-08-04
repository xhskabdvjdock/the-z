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

    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
    const executor = auditLogs?.entries.first()?.executor;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔨 Member Banned")
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: "Reason", value: ban.reason || "No reason provided", inline: true },
        { name: "Banned By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
        { name: "Account Created", value: `<t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `User ID: ${ban.user.id}` })
      .setTimestamp();

    await sendLog(client, ban.guild.id, "moderation", embed);
  }
};

export default event;
