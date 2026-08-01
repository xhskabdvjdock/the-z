import { GuildMember } from "discord.js";
import { ExtendedClient } from "../client";
import { getGuildConfig } from "../utils/guildConfig";

/** يعطي الرولات التلقائية للأعضاء الجدد (بشرياً كان أو بوت) عند الانضمام */
export async function handleAutoRole(client: ExtendedClient, member: GuildMember) {
  const gConfig = await getGuildConfig(client, member.guild.id);
  if (!gConfig.autoRole?.enabled) return;

  const roleIds = member.user.bot ? gConfig.autoRole.botRoleIds : gConfig.autoRole.userRoleIds;
  if (!roleIds?.length) return;

  for (const roleId of roleIds) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) await member.roles.add(role).catch(() => null);
  }
}
