import { BotCommand } from "../../types/command";
import { JailUser } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";

const command: BotCommand = {
  name: "unjail",
  description: "Unjail a user (restore roles and remove jail role)",
  category: "إشراف",
  defaultMemberPermissions: "Administrator",
  guildOnly: true,
  async run(ctx) {
    // Get target user from args
    const targetId = ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) {
      await ctx.reply("Please specify a user to unjail.");
      return;
    }

    const targetMember = await ctx.getMember(targetId);
    if (!targetMember) {
      await ctx.reply("User not found.");
      return;
    }

    // Get guild config
    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);
    if (!gConfig.jail?.enabled || !gConfig.jail.roleId) {
      await ctx.reply("Jail system is not configured.");
      return;
    }

    const jailRole = ctx.guild.roles.cache.get(gConfig.jail.roleId);
    if (!jailRole) {
      await ctx.reply("Jail role not found.");
      return;
    }

    // Check if jailed
    const jailRecord = await JailUser.findOne({ userId: targetId, guildId: ctx.guild.id });
    if (!jailRecord) {
      await ctx.reply("User is not jailed.");
      return;
    }

    // Remove jail role
    await targetMember.roles.remove(jailRole).catch(() => null);

    // Restore original roles
    for (const roleId of jailRecord.originalRoles) {
      const role = ctx.guild.roles.cache.get(roleId);
      if (role) {
        await targetMember.roles.add(role).catch(() => null);
      }
    }

    // Delete jail record
    await JailUser.deleteOne({ userId: targetId, guildId: ctx.guild.id });

    await ctx.reply(`Successfully unjailed ${targetMember.user.tag}.`);
  }
};

export default command;
