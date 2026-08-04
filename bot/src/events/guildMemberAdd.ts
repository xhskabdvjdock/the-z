import { EmbedBuilder, GuildMember } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { handleAutoRole } from "../modules/autoRole";
import { handleMemberJoinCaptcha } from "../modules/captcha/captcha";
import { sendWelcomeMessage } from "../modules/welcome/welcomeManager";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildMemberAdd",
  async execute(client, member: GuildMember) {
    const gConfig = await getGuildConfig(client, member.guild.id);

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
