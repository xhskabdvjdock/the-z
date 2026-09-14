import { AuditLogEvent, EmbedBuilder, GuildBan } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "guildBanRemove",
  async execute(client, ban: GuildBan) {
    let executor: any = null;
    try {
      const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === ban.user.id && Date.now() - e.createdTimestamp < 10000) || audit.entries.first();
      executor = entry?.executor || null;
    } catch {}
    const nowUnix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Member Unbanned")
      .addFields(
        { name: "User", value: `${ban.user.tag} <@${ban.user.id}> (\`${ban.user.id}\`)`, inline: false },
        { name: "Unbanned By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Unknown", inline: false },
        { name: "Account Created", value: `<t:${Math.floor(ban.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>)`, inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      )
      .setFooter({ text: `User ID: ${ban.user.id} | Guild: ${ban.guild.name}` })
      .setTimestamp();

    await sendLog(client, ban.guild.id, "moderation", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      targetId: ban.user.id,
      targetTag: ban.user.tag
    });
  }
};

export default event;
