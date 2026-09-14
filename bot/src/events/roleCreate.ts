import { AuditLogEvent, EmbedBuilder, Role } from "discord.js";
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

    let executor: any = null;
    try {
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === role.id && Date.now() - e.createdTimestamp < 10000) || audit.entries.first();
      executor = entry?.executor || null;
    } catch {}

    const permissions = role.permissions.toArray().slice(0, 8).join(", ");
    const nowUnix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Role Created")
      .addFields(
        { name: "Role", value: `${role.name} <@&${role.id}> (\`${role.id}\`)`, inline: false },
        { name: "Color", value: role.hexColor || "Default", inline: true },
        { name: "Position", value: `${role.position}`, inline: true },
        { name: "Created By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Unknown", inline: false },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      );
    if (permissions) {
      embed.addFields({ name: "Permissions", value: permissions.slice(0, 1024), inline: false });
    }
    embed.setFooter({ text: `Role ID: ${role.id} | Guild: ${role.guild.name}` }).setTimestamp();

    await sendLog(client, role.guild.id, "roles", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      roleId: role.id,
      roleName: role.name,
      details: { color: role.hexColor, permissions: role.permissions.toArray(), position: role.position }
    });
  }
};

export default event;
