import { EmbedBuilder, Role } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "roleUpdate",
  async execute(client, oldRole: Role, newRole: Role) {
    const changes: string[] = [];

    // Name change
    if (oldRole.name !== newRole.name) {
      changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
    }

    // Color change
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`Color: ${oldRole.hexColor || "Default"} → ${newRole.hexColor || "Default"}`);
    }

    // Hoist change
    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`Hoisted: ${oldRole.hoist ? "Yes" : "No"} → ${newRole.hoist ? "Yes" : "No"}`);
    }

    // Mentionable change
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`Mentionable: ${oldRole.mentionable ? "Yes" : "No"} → ${newRole.mentionable ? "Yes" : "No"}`);
    }

    // Permissions change
    const oldPerms = oldRole.permissions.toArray();
    const newPerms = newRole.permissions.toArray();
    if (oldPerms.join(",") !== newPerms.join(",")) {
      const added = newPerms.filter(p => !oldPerms.includes(p));
      const removed = oldPerms.filter(p => !newPerms.includes(p));
      
      if (added.length > 0) {
        changes.push(`Permissions Added: ${added.slice(0, 3).join(", ")}${added.length > 3 ? "..." : ""}`);
      }
      if (removed.length > 0) {
        changes.push(`Permissions Removed: ${removed.slice(0, 3).join(", ")}${removed.length > 3 ? "..." : ""}`);
      }
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Role Updated")
      .addFields(
        { name: "Role", value: `${newRole.name} (${newRole.id})`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `Role ID: ${newRole.id}` });
    embed.setTimestamp();

    await sendLog(client, newRole.guild.id, "roles", embed);
  }
};

export default event;
