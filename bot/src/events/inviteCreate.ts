import { AuditLogEvent, EmbedBuilder, Invite } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "inviteCreate",
  async execute(client, invite: Invite) {
    if (!invite.guild) return;
    let executor: any = invite.inviter || null;
    try {
      if (!executor) {
        const audit = await invite.guild.fetchAuditLogs({ type: AuditLogEvent.InviteCreate, limit: 5 });
        const entry = audit.entries.find((e) => (e.target as any)?.code === invite.code && Date.now() - e.createdTimestamp < 10000);
        executor = entry?.executor || null;
      }
    } catch {}
    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Invite Created")
      .addFields(
        { name: "Code", value: `\`${invite.code}\` (https://discord.gg/${invite.code})`, inline: true },
        { name: "Creator", value: executor ? `${executor.tag} <@${executor.id}>` : invite.inviter ? `${invite.inviter.tag}` : "Unknown", inline: true },
        { name: "Channel", value: invite.channel ? `<#${(invite.channel as any).id}> \`${(invite.channel as any).name || (invite.channel as any).id}\`` : "Unknown", inline: true },
        { name: "Max Uses", value: invite.maxUses ? invite.maxUses.toString() : "Unlimited", inline: true },
        { name: "Max Age", value: invite.maxAge ? `${Math.floor(invite.maxAge / 3600)}h` : "Never", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      );
    if (invite.expiresTimestamp) {
      embed.addFields({ name: "Expires", value: `<t:${Math.floor(invite.expiresTimestamp / 1000)}:F> (<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>)`, inline: true });
    }
    embed.setFooter({ text: `Invite Code: ${invite.code} | Guild: ${invite.guild.name}` }).setTimestamp();

    await sendLog(client, invite.guild.id, "invites", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      channelId: (invite.channel as any)?.id,
      channelName: (invite.channel as any)?.name,
      details: { code: invite.code, maxUses: invite.maxUses, maxAge: invite.maxAge, temporary: invite.temporary }
    });
  }
};

export default event;
