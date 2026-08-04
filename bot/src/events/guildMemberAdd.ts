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

    // Check if user was jailed before leaving
    if (gConfig.jail?.enabled && gConfig.jail.roleId) {
      const jailRecord = await JailUser.findOne({ userId: member.id, guildId: member.guild.id });
      if (jailRecord) {
        const jailRole = member.guild.roles.cache.get(gConfig.jail.roleId);
        if (jailRole) {
          // Re-apply jail role
          await member.roles.add(jailRole).catch(() => null);
          
          // Remove roles that should be removed when jailed
          const rolesToRemove = member.roles.cache.filter(r => gConfig.jail.removeRoles.includes(r.id));
          if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove).catch(() => null);
          }
        }
      }
    }

    if (gConfig.captcha?.enabled) {
      const handled = await handleMemberJoinCaptcha(client, member, gConfig);
      if (handled) return; // موديول الكابتشا سيتكفّل بمنح الرولات وإرسال الترحيب بعد التحقق
    }

    await handleAutoRole(client, member);
    await sendWelcomeMessage(client, member, gConfig);

    const accountAge = Date.now() - member.user.createdTimestamp;
    const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000; // less than 7 days

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📥 Member Joined")
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
        { name: "Account Age", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Server Members", value: `${member.guild.memberCount}`, inline: true },
        { name: "New Account", value: isNewAccount ? "Yes ⚠️" : "No", inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    await sendLog(client, member.guild.id, "members", embed);
  }
};

export default event;
