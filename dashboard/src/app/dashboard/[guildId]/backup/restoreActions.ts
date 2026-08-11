"use server";

import { requireGuildAdmin } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { getGuildInfo } from "@/lib/discord";
import { GuildConfig, ServerBackup, RestoreOptions } from "@thez/shared";
import { logAction, logError } from "@/lib/logger";

function botHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
}

export async function restoreBackup(guildId: string, backup: ServerBackup, options: RestoreOptions = {
  deleteExistingRoles: true,
  deleteExistingChannels: true,
  restoreRoles: true,
  restoreChannels: true,
  restoreBotConfig: true
}) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    const guild = await getGuildInfo(guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    logAction({
      label: "backup/restore",
      guildId,
      guildName: guild.name,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "بدء استعادة نسخة احتياطية",
      details: {
        backupTimestamp: backup.timestamp ?? null,
        roles: backup.roles.length,
        channels: backup.channels.length,
        deleteExistingRoles: options.deleteExistingRoles,
        deleteExistingChannels: options.deleteExistingChannels,
        restoreRoles: options.restoreRoles,
        restoreChannels: options.restoreChannels,
        restoreBotConfig: options.restoreBotConfig
      }
    });

    // Step 1: Restore roles if requested
    if (options.restoreRoles && backup.roles.length > 0) {
      const roleIdMap = new Map<string, string>();
      const existingRoles = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: botHeaders()
      }).then(r => r.json());

      // Delete existing roles if requested
      if (options.deleteExistingRoles) {
        console.log("Starting to delete existing roles...");
        for (const role of existingRoles) {
          if (role.name !== "@everyone") {
            let shouldRetry = true;
            let retryCount = 0;
            const maxRetries = 5;
            
            while (shouldRetry && retryCount < maxRetries) {
              try {
                console.log(`Deleting role: ${role.name} (${role.id})`);
                const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${role.id}`, {
                  method: "DELETE",
                  headers: botHeaders()
                });
                
                if (response.ok) {
                  console.log(`Successfully deleted role: ${role.name}`);
                  shouldRetry = false;
                } else if (response.status === 429) {
                  const rateLimitData = await response.json();
                  const retryAfter = (rateLimitData.retry_after || 1) * 1000;
                  console.log(`Rate limited for ${role.name}, waiting ${retryAfter}ms...`);
                  await new Promise(resolve => setTimeout(resolve, retryAfter));
                  retryCount++;
                } else {
                  console.error(`Failed to delete role ${role.name}:`, response.status, await response.text());
                  shouldRetry = false; // Don't retry on other errors
                }
              } catch (e) {
                console.error("Failed to delete role:", role.name, e);
                shouldRetry = false;
              }
            }
            
            // Add small delay between successful deletions
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        console.log("Finished deleting existing roles");
      }

      // Create roles from backup
      const sortedRoles = [...backup.roles].sort((a, b) => a.position - b.position);
      for (const role of sortedRoles) {
        if (role.name === "@everyone") {
          roleIdMap.set(role.id, guildId); // @everyone uses guild ID
          continue;
        }

        let shouldRetry = true;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (shouldRetry && retryCount < maxRetries) {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
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
            });
            
            if (response.ok) {
              const newRole = await response.json();
              if (newRole.id) {
                roleIdMap.set(role.id, newRole.id);
              }
              shouldRetry = false;
            } else if (response.status === 429) {
              const rateLimitData = await response.json();
              const retryAfter = (rateLimitData.retry_after || 1) * 1000;
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              retryCount++;
            } else {
              console.error("Failed to create role:", role.name, response.status);
              shouldRetry = false;
            }
          } catch (e) {
            console.error("Failed to create role:", role.name, e);
            shouldRetry = false;
          }
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Step 2: Restore channels if requested
    if (options.restoreChannels && backup.channels.length > 0) {
      const channelIdMap = new Map<string, string>();
      
      // Delete existing channels if requested
      if (options.deleteExistingChannels) {
        const existingChannels = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          headers: botHeaders()
        }).then(r => r.json());

        for (const channel of existingChannels) {
          let shouldRetry = true;
          let retryCount = 0;
          const maxRetries = 5;
          
          while (shouldRetry && retryCount < maxRetries) {
            try {
              const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}`, {
                method: "DELETE",
                headers: botHeaders()
              });
              
              if (response.ok) {
                shouldRetry = false;
              } else if (response.status === 429) {
                const rateLimitData = await response.json();
                const retryAfter = (rateLimitData.retry_after || 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                retryCount++;
              } else {
                console.error("Failed to delete channel:", channel.name, response.status);
                shouldRetry = false;
              }
            } catch (e) {
              console.error("Failed to delete channel:", channel.name, e);
              shouldRetry = false;
            }
          }
          
          // Add delay between deletions
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Create categories first, then other channels
      const categories = backup.channels.filter(c => c.type === "category");
      const otherChannels = backup.channels.filter(c => c.type !== "category");

      for (const category of categories) {
        let shouldRetry = true;
        let retryCount = 0;
        const maxRetries = 5;
        let newChannel;
        
        while (shouldRetry && retryCount < maxRetries) {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
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
                  id: ow.id,
                  type: ow.type === "role" ? 0 : 1,
                  allow: ow.allow,
                  deny: ow.deny
                }))
              })
            });
            
            if (response.ok) {
              newChannel = await response.json();
              shouldRetry = false;
            } else if (response.status === 429) {
              const rateLimitData = await response.json();
              const retryAfter = (rateLimitData.retry_after || 1) * 1000;
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              retryCount++;
            } else {
              console.error("Failed to create category:", category.name, response.status);
              shouldRetry = false;
            }
          } catch (e) {
            console.error("Failed to create category:", category.name, e);
            shouldRetry = false;
          }
        }

        if (newChannel?.id) {
          channelIdMap.set(category.id, newChannel.id);
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      for (const channel of otherChannels) {
        const channelType = channel.type === "text" ? 0 : 
                            channel.type === "voice" ? 2 : 
                            channel.type === "announcement" ? 5 : 
                            channel.type === "stage" ? 13 : 
                            channel.type === "forum" ? 15 : 0;

        let shouldRetry = true;
        let retryCount = 0;
        const maxRetries = 5;
        let newChannel;
        
        while (shouldRetry && retryCount < maxRetries) {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
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
                  id: ow.id,
                  type: ow.type === "role" ? 0 : 1,
                  allow: ow.allow,
                  deny: ow.deny
                }))
              })
            });
            
            if (response.ok) {
              newChannel = await response.json();
              shouldRetry = false;
            } else if (response.status === 429) {
              const rateLimitData = await response.json();
              const retryAfter = (rateLimitData.retry_after || 1) * 1000;
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              retryCount++;
            } else {
              console.error("Failed to create channel:", channel.name, response.status);
              shouldRetry = false;
            }
          } catch (e) {
            console.error("Failed to create channel:", channel.name, e);
            shouldRetry = false;
          }
        }

        if (newChannel?.id) {
          channelIdMap.set(channel.id, newChannel.id);
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Step 3: Restore bot configuration if requested
    if (options.restoreBotConfig && backup.config) {
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
    }

    return { success: true, message: "Backup restored successfully" };
  } catch (error) {
    logError("backup/restore", error);
    throw error;
  }
}
