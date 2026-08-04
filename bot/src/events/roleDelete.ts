import { EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleRoleDelete as antiNukeRoleDelete } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "roleDelete",
  async execute(client, role: Role) {
    const gConfig = await getGuildConfig(client, role.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeRoleDelete(client, role, gConfig).catch(() => null);
    }

    const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 32 }).catch(() => null);
    const executor = auditLogs?.entries.first()?.executor;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Role Deleted")
      .addFields(
        { name: "Role", value: `${role.name} (${role.id})`, inline: true },
        { name: "Color", value: role.hexColor || "Default", inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setFooter({ text: `Role ID: ${role.id}` })
      .setTimestamp();

    await sendLog(client, role.guild.id, "roles", embed);
  }
};

export default event;
