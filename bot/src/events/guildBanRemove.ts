import { EmbedBuilder, GuildBan } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildBanRemove",
  async execute(client, ban: GuildBan) {
    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 23 }).catch(() => null);
    const executor = auditLogs?.entries.first()?.executor;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Member Unbanned")
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: "Unbanned By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
        { name: "Account Created", value: `<t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `User ID: ${ban.user.id}` })
      .setTimestamp();

    await sendLog(client, ban.guild.id, "moderation", embed);
  }
};

export default event;
