import { AuditLogEvent, EmbedBuilder, GuildBan } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { sendLog } from "../modules/logging/logger";
import { handleBanAdd as antiNukeBanAdd } from "../modules/antinuke/antinuke";

const event: BotEvent = {
  name: "guildBanAdd",
  async execute(client, ban: GuildBan) {
    const gConfig = await getGuildConfig(client, ban.guild.id);
    if (gConfig.antiNuke?.enabled) {
      await antiNukeBanAdd(client, ban.guild, ban.user, gConfig).catch(() => null);
    }

    let executor: any = null;
    let reason: string | undefined = ban.reason || undefined;
    try {
      const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
      const entry = audit.entries.find((e) => (e.target as any)?.id === ban.user.id && Date.now() - e.createdTimestamp < 10000) || audit.entries.first();
      if (entry) {
        executor = entry.executor;
        if (entry.reason) reason = entry.reason;
      }
    } catch {}

    const nowUnix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Member Banned")
      .addFields(
        { name: "User", value: `${ban.user.tag} <@${ban.user.id}> (\`${ban.user.id}\`)`, inline: false },
        { name: "Reason", value: reason || "No reason provided", inline: false },
        { name: "Banned By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Unknown", inline: false },
        { name: "Account Created", value: `<t:${Math.floor(ban.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>)`, inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      )
      .setFooter({ text: `User ID: ${ban.user.id} | Guild: ${ban.guild.name}` })
      .setTimestamp();

    await sendLog(client, ban.guild.id, "moderation", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      targetId: ban.user.id,
      targetTag: ban.user.tag,
      reason,
      details: { accountCreated: ban.user.createdAt.toISOString() }
    });
  }
};

export default event;
