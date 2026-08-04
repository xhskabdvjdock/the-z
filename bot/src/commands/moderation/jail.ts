import { BotCommand } from "../../types/command";
import { JailUser } from "@thez/shared";
import { getGuildConfig } from "../../utils/guildConfig";

const command: BotCommand = {
  name: "jail",
  description: "Jail a user (remove roles and give jail role)",
  category: "إشراف",
  defaultMemberPermissions: "Administrator",
  guildOnly: true,
  async run(ctx) {
    // Get target user from args
    const targetId = ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) {
      await ctx.reply("Please specify a user to jail.");
      return;
    }

    const targetMember = await ctx.getMember(targetId);
    if (!targetMember) {
      await ctx.reply("User not found.");
      return;
    }

    // Check if target is admin
    if (targetMember.permissions.has("Administrator")) {
      await ctx.reply("Cannot jail administrators.");
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

    // Check if already jailed
    const existingJail = await JailUser.findOne({ userId: targetId, guildId: ctx.guild.id });
    if (existingJail) {
      await ctx.reply("User is already jailed.");
      return;
    }

    // Store current roles
    const currentRoles = targetMember.roles.cache
      .filter(r => r.id !== ctx.guild.id && !gConfig.jail.removeRoles.includes(r.id))
      .map(r => r.id);

    // Remove specified roles
    const rolesToRemove = targetMember.roles.cache.filter(r => gConfig.jail.removeRoles.includes(r.id));
    if (rolesToRemove.size > 0) {
      await targetMember.roles.remove(rolesToRemove).catch(() => null);
    }

    // Give jail role
    await targetMember.roles.add(jailRole).catch(() => null);

    // Save to database
    await JailUser.create({
      userId: targetId,
      guildId: ctx.guild.id,
      originalRoles: currentRoles,
      jailedBy: ctx.user.id,
      jailedAt: new Date()
    });

    await ctx.reply(`Successfully jailed ${targetMember.user.tag}.`);
  }
};

export default command;
