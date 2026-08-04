import { EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleRoleCreate as antiNukeRoleCreate } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "roleCreate",
  async execute(client, role: Role) {
    const gConfig = await getGuildConfig(client, role.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await antiNukeRoleCreate(client, role, gConfig).catch(() => null);
    }

    const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 30 }).catch(() => null);
    const executor = auditLogs?.entries.first()?.executor;

    const permissions = role.permissions.toArray()
      .filter(p => !p.includes("ADMINISTRATOR"))
      .slice(0, 5)
      .join(", ");

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("➕ Role Created")
      .addFields(
        { name: "Role", value: `${role.name} (${role.id})`, inline: true },
        { name: "Color", value: role.hexColor || "Default", inline: true },
        { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      );

    if (permissions) {
      embed.addFields({ name: "Key Permissions", value: permissions, inline: false });
    }

    embed.setFooter({ text: `Role ID: ${role.id}` });
    embed.setTimestamp();

    await sendLog(client, role.guild.id, "roles", embed);
  }
};

export default event;
