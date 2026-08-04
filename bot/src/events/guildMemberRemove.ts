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

    const joinDate = guildMember.joinedAt ? `<t:${Math.floor(guildMember.joinedAt.getTime() / 1000)}:R>` : "Unknown";
    const timeInServer = guildMember.joinedAt ? `<t:${Math.floor(guildMember.joinedAt.getTime() / 1000)}:R>` : "Unknown";

    // Get roles the member had
    const roles = guildMember.roles.cache
      .filter(r => r.id !== guildMember.guild.id)
      .map(r => r.name)
      .slice(0, 5)
      .join(", ");

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Member Left")
      .addFields(
        { name: "User", value: `${guildMember.user.tag} (${guildMember.id})`, inline: true },
        { name: "Joined Server", value: joinDate, inline: true },
        { name: "Time in Server", value: timeInServer, inline: true },
        { name: "Server Members", value: `${guildMember.guild.memberCount}`, inline: true }
      );

    if (roles) {
      embed.addFields({ name: "Roles", value: roles || "No additional roles", inline: false });
    }

    embed.setThumbnail(guildMember.user.displayAvatarURL());
    embed.setFooter({ text: `User ID: ${guildMember.id}` });
    embed.setTimestamp();

    await sendLog(client, guildMember.guild.id, "members", embed);
  }
};

export default event;
