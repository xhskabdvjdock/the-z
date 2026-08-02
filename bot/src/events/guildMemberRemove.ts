import { EmbedBuilder, GuildMember, User } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLeaveMessage } from "../modules/welcome/welcomeManager";
import { sendLog } from "../modules/logging/logger";
import { handleMemberRemove as handleAntiNukeMemberRemove } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "guildMemberRemove",
  async execute(client, member: GuildMember | { guild: any; user: User; id: string }) {
    const guildMember = member as GuildMember;
    const gConfig = await getGuildConfig(client, guildMember.guild.id);

    if (gConfig.antiNuke?.enabled) {
      await handleAntiNukeMemberRemove(client, guildMember, gConfig).catch(() => null);
    }

    await sendLeaveMessage(client, guildMember, gConfig);

    await sendLog(
      client,
      guildMember.guild.id,
      "members",
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("📤 عضو غادر السيرفر")
        .setDescription(`${guildMember.user.tag} (\`${guildMember.id}\`)`)
        .addFields({ name: "عدد الأعضاء", value: `${guildMember.guild.memberCount}` })
        .setThumbnail(guildMember.user.displayAvatarURL())
    );
  }
};

export default event;
