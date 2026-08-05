"use server";

import { requireGuildAdmin } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { getGuildInfo } from "@/lib/discord";
import { GuildConfig, ServerBackup } from "@thez/shared";

function botHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
}

export async function restoreBackup(guildId: string, backup: ServerBackup) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    const guild = await getGuildInfo(guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    // Step 1: Restore roles (skip @everyone and managed roles)
    const roleIdMap = new Map<string, string>();
    const existingRoles = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: botHeaders()
    }).then(r => r.json());

    // Delete existing roles (except @everyone and managed roles)
    for (const role of existingRoles) {
      if (role.name !== "@everyone" && !role.managed) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${role.id}`, {
            method: "DELETE",
            headers: botHeaders()
          });
        } catch (e) {
          console.error("Failed to delete role:", role.name, e);
        }
      }
    }

    // Create roles from backup
    const sortedRoles = [...backup.roles].sort((a, b) => a.position - b.position);
    for (const role of sortedRoles) {
      if (role.name === "@everyone") {
        roleIdMap.set(role.id, guildId); // @everyone uses guild ID
        continue;
      }

      const newRole = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...botHeaders()
        },
        body: JSON.stringify({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          mentionable: role.mentionable,
          permissions: role.permissions
        })
      }).then(r => r.json());

      if (newRole.id) {
        roleIdMap.set(role.id, newRole.id);
      }

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 2: Restore channels
    const channelIdMap = new Map<string, string>();
    
    // Delete existing channels
    const existingChannels = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: botHeaders()
    }).then(r => r.json());

    for (const channel of existingChannels) {
      try {
        await fetch(`https://discord.com/api/v10/channels/${channel.id}`, {
          method: "DELETE",
          headers: botHeaders()
        });
      } catch (e) {
        console.error("Failed to delete channel:", channel.name, e);
      }
    }

    // Create categories first, then other channels
    const categories = backup.channels.filter(c => c.type === "category");
    const otherChannels = backup.channels.filter(c => c.type !== "category");

    for (const category of categories) {
      const newChannel = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...botHeaders()
        },
        body: JSON.stringify({
          type: 4, // category
          name: category.name,
          position: category.position,
          permission_overwrites: category.permissionOverwrites.map(ow => ({
            id: roleIdMap.get(ow.id) || ow.id,
            type: ow.type === "role" ? 0 : 1,
            allow: ow.allow,
            deny: ow.deny
          }))
        })
      }).then(r => r.json());

      if (newChannel.id) {
        channelIdMap.set(category.id, newChannel.id);
      }

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    for (const channel of otherChannels) {
      const channelType = channel.type === "text" ? 0 : 
                          channel.type === "voice" ? 2 : 
                          channel.type === "announcement" ? 5 : 
                          channel.type === "stage" ? 13 : 
                          channel.type === "forum" ? 15 : 0;

      const newChannel = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...botHeaders()
        },
        body: JSON.stringify({
          type: channelType,
          name: channel.name,
          parent_id: channel.parentId ? channelIdMap.get(channel.parentId) : null,
          position: channel.position,
          topic: channel.topic,
          nsfw: channel.nsfw,
          rate_limit_per_user: channel.rateLimitPerUser,
          permission_overwrites: channel.permissionOverwrites.map(ow => ({
            id: roleIdMap.get(ow.id) || ow.id,
            type: ow.type === "role" ? 0 : 1,
            allow: ow.allow,
            deny: ow.deny
          }))
        })
      }).then(r => r.json());

      if (newChannel.id) {
        channelIdMap.set(channel.id, newChannel.id);
      }

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 3: Restore bot configuration
    const newConfig = {
      prefix: backup.config.prefix,
      automod: backup.config.automod,
      tickets: backup.config.tickets,
      tempVoice: backup.config.tempVoice,
      welcome: backup.config.welcome,
      captcha: backup.config.captcha,
      leveling: backup.config.leveling,
      jail: backup.config.jail,
      logging: backup.config.logging,
      antiNuke: backup.config.antiNuke,
      autoResponse: backup.config.autoResponse,
      selfRoles: backup.config.selfRoles,
      colorRoles: backup.config.colorRoles
    };

    const existingConfig = await GuildConfig.findOne({ guildId });
    if (existingConfig) {
      await GuildConfig.findOneAndUpdate({ guildId }, { $set: newConfig });
    } else {
      await GuildConfig.create({ guildId, ...newConfig });
    }

    return { success: true, message: "Backup restored successfully" };
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw error;
  }
}
