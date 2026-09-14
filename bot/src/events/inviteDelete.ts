import { AuditLogEvent, EmbedBuilder, Invite } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "inviteDelete",
  async execute(client, invite: Invite) {
    if (!invite.guild) return;
    let executor: any = null;
    try {
      const audit = await invite.guild.fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.code === invite.code && Date.now() - e.createdTimestamp < 10000);
      executor = entry?.executor || null;
    } catch {}
    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Invite Deleted")
      .addFields(
        { name: "Code", value: `\`${invite.code}\``, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag} <@${executor.id}>` : "Unknown", inline: true },
        { name: "Uses", value: invite.uses ? invite.uses.toString() : "0", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      )
      .setFooter({ text: `Invite Code: ${invite.code} | Guild: ${invite.guild.name}` })
      .setTimestamp();

    await sendLog(client, invite.guild.id, "invites", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      details: { code: invite.code, uses: invite.uses }
    });
  }
};

export default event;
