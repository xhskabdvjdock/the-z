import { EmbedBuilder, GuildMember } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { handleAutoRole } from "../modules/autoRole";
import { handleMemberJoinCaptcha } from "../modules/captcha/captcha";
import { sendWelcomeMessage } from "../modules/welcome/welcomeManager";
import { sendLog } from "../modules/logging/logger";
import { JailUser } from "@thez/shared";

const event: BotEvent = {
  name: "guildMemberAdd",
  async execute(client, member: GuildMember) {
    const gConfig = await getGuildConfig(client, member.guild.id);

    if (gConfig.jail?.enabled && gConfig.jail.roleId) {
      let jailRecord = await JailUser.findOne({ userId: member.id, guildId: member.guild.id });
      if (jailRecord) {
        if (jailRecord.jailedUntil && new Date(jailRecord.jailedUntil).getTime() <= Date.now()) {
          await JailUser.deleteOne({ userId: member.id, guildId: member.guild.id }).catch(() => null);
          jailRecord = null;
        }
      }
      if (jailRecord) {
        const jailRole = member.guild.roles.cache.get(gConfig.jail.roleId);
        if (jailRole) {
          await member.roles.add(jailRole).catch(() => null);
          const rolesToRemove = member.roles.cache.filter((r) => gConfig.jail.removeRoles.includes(r.id));
          if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove).catch(() => null);
          }
        }
      }
    }

    if (gConfig.captcha?.enabled) {
      const handled = await handleMemberJoinCaptcha(client, member, gConfig);
      if (handled) return;
    }

    await handleAutoRole(client, member);
    await sendWelcomeMessage(client, member, gConfig);

    const nowUnix = Math.floor(Date.now() / 1000);
    const accountAge = Date.now() - member.user.createdTimestamp;
    const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Member Joined")
      .addFields(
        { name: "User", value: `${member.user.tag} <@${member.id}> (\`${member.id}\`)`, inline: false },
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`, inline: true },
        { name: "Joined At", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true },
        { name: "Server Members", value: `${member.guild.memberCount}`, inline: true },
        { name: "New Account", value: isNewAccount ? "Yes - less than 7 days" : "No", inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `User ID: ${member.id} | Guild: ${member.guild.name}` })
      .setTimestamp();

    await sendLog(client, member.guild.id, "members", embed, undefined, {
      targetId: member.id,
      targetTag: member.user.tag,
      details: { accountAgeDays: Math.floor(accountAge / 86400000), memberCount: member.guild.memberCount, isNewAccount }
    });
  }
};

export default event;
