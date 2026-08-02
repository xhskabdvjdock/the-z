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

    await sendLog(
      client,
      member.guild.id,
      "members",
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📥 عضو جديد انضم")
        .setDescription(`${member} (\`${member.user.tag}\`)`)
        .addFields({ name: "عدد الأعضاء", value: `${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL())
    );
  }
};

export default event;
