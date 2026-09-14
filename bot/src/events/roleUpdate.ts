import { AuditLogEvent, EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "roleUpdate",
  async execute(client, oldRole: Role, newRole: Role) {
    const changes: string[] = [];
    const before: any = {};
    const after: any = {};

    if (oldRole.name !== newRole.name) {
      changes.push(`Name: \`${oldRole.name}\` -> \`${newRole.name}\``);
      before.name = oldRole.name;
      after.name = newRole.name;
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`Color: ${oldRole.hexColor || "Default"} -> ${newRole.hexColor || "Default"}`);
      before.color = oldRole.hexColor;
      after.color = newRole.hexColor;
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`Hoisted: ${oldRole.hoist ? "Yes" : "No"} -> ${newRole.hoist ? "Yes" : "No"}`);
      before.hoist = oldRole.hoist;
      after.hoist = newRole.hoist;
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`Mentionable: ${oldRole.mentionable ? "Yes" : "No"} -> ${newRole.mentionable ? "Yes" : "No"}`);
      before.mentionable = oldRole.mentionable;
      after.mentionable = newRole.mentionable;
    }
    const oldPerms = oldRole.permissions.toArray();
    const newPerms = newRole.permissions.toArray();
    if (oldPerms.join(",") !== newPerms.join(",")) {
      const added = newPerms.filter((p) => !oldPerms.includes(p));
      const removed = oldPerms.filter((p) => !newPerms.includes(p));
      if (added.length > 0) {
        changes.push(`Permissions Added: ${added.slice(0, 5).join(", ")}${added.length > 5 ? "..." : ""}`);
        before.permsAdded = [];
        after.permsAdded = added;
      }
      if (removed.length > 0) {
        changes.push(`Permissions Removed: ${removed.slice(0, 5).join(", ")}${removed.length > 5 ? "..." : ""}`);
        before.permsRemoved = removed;
        after.permsRemoved = [];
      }
    }

    if (changes.length === 0) return;

    let executor: any = null;
    try {
      const audit = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === newRole.id && Date.now() - e.createdTimestamp < 10000);
      executor = entry?.executor || null;
    } catch {}

    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Role Updated")
      .addFields(
        { name: "Role", value: `${newRole.name} <@&${newRole.id}> (\`${newRole.id}\`)`, inline: false },
        { name: "Updated By", value: executor ? `${executor.tag} <@${executor.id}>` : "Unknown", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );
    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change.slice(0, 1024) });
    });
    embed.setFooter({ text: `Role ID: ${newRole.id} | Guild: ${newRole.guild.name}` }).setTimestamp();

    await sendLog(client, newRole.guild.id, "roles", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      roleId: newRole.id,
      roleName: newRole.name,
      before,
      after,
      details: { changes }
    });
  }
};

export default event;
