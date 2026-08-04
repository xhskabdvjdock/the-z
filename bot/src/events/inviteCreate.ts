import { EmbedBuilder, Invite } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "inviteCreate",
  async execute(client, invite: Invite) {
    if (!invite.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Invite Created")
      .addFields(
        { name: "Code", value: invite.code || "Unknown", inline: true },
        { name: "Creator", value: invite.inviter ? `${invite.inviter.tag}` : "Unknown", inline: true },
        { name: "Max Uses", value: invite.maxUses ? invite.maxUses.toString() : "Unlimited", inline: true },
        { name: "Channel", value: invite.channel ? `${invite.channel.name}` : "Unknown", inline: true }
      );

    if (invite.expiresTimestamp) {
      embed.addFields({ 
        name: "Expires", 
        value: `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`, 
        inline: true 
      });
    }

    embed.setFooter({ text: `Invite Code: ${invite.code}` });
    embed.setTimestamp();

    await sendLog(client, invite.guild.id, "invites", embed);
  }
};

export default event;
