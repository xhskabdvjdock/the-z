import { EmbedBuilder, Invite } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "inviteDelete",
  async execute(client, invite: Invite) {
    if (!invite.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Invite Deleted")
      .addFields(
        { name: "Code", value: invite.code || "Unknown", inline: true },
        { name: "Creator", value: invite.inviter ? `${invite.inviter.tag}` : "Unknown", inline: true },
        { name: "Uses", value: invite.uses ? invite.uses.toString() : "0", inline: true }
      )
      .setFooter({ text: `Invite Code: ${invite.code}` })
      .setTimestamp();

    await sendLog(client, invite.guild.id, "invites", embed);
  }
};

export default event;
