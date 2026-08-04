import { EmbedBuilder, GuildMember } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildMemberUpdate",
  async execute(client, oldMember: GuildMember, newMember: GuildMember) {
    if (!newMember.guild) return;

    const changes: string[] = [];

    // Check for nickname change
    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`Nickname: ${oldMember.nickname || "None"} → ${newMember.nickname || "None"}`);
    }

    // Check for avatar change
    if (oldMember.avatar !== newMember.avatar) {
      changes.push("Avatar changed");
    }

    // Check for role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0) {
      changes.push(`Roles Added: ${addedRoles.map(r => r.name).join(", ")}`);
    }

    if (removedRoles.size > 0) {
      changes.push(`Roles Removed: ${removedRoles.map(r => r.name).join(", ")}`);
    }

    // Check for timeout
    if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
      if (newMember.communicationDisabledUntil) {
        const duration = Math.floor((newMember.communicationDisabledUntilTimestamp! - Date.now()) / 1000 / 60);
        changes.push(`Timeout applied (${duration} minutes)`);
      } else {
        changes.push("Timeout removed");
      }
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Member Updated")
      .addFields(
        { name: "User", value: `${newMember.user.tag} (${newMember.id})`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `User ID: ${newMember.id}` });
    embed.setTimestamp();

    await sendLog(client, newMember.guild.id, "members", embed);
  }
};

export default event;
