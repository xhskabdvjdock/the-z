import { AuditLogEvent, EmbedBuilder, Collection, Message } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "messageDeleteBulk",
  async execute(client, messages: Collection<string, Message>) {
    const firstMessage = messages.first();
    if (!firstMessage?.guild) return;
    const guild = firstMessage.guild;
    const channelId = firstMessage.channelId;
    const channel = firstMessage.channel as any;
    const channelName = channel?.name || "Unknown";

    let executor: any = null;
    try {
      const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 8 });
      const entry = audit.entries.find((e) => (e.extra as any)?.channel?.id === channelId && Date.now() - e.createdTimestamp < 10000) || audit.entries.first();
      executor = entry?.executor || null;
    } catch {}

    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Messages Bulk Deleted")
      .addFields(
        { name: "Channel", value: `<#${channelId}> \`${channelName}\` (\`${channelId}\`)`, inline: false },
        { name: "Messages Deleted", value: `${messages.size}`, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag} <@${executor.id}> (\`${executor.id}\`)` : "Unknown", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: false }
      );

    const sampleMessages = messages
      .filter((m) => m.content && !m.author.bot)
      .map((m) => `${m.author.tag}: ${m.content.slice(0, 100)}`)
      .slice(0, 5)
      .join("\n");
    if (sampleMessages) {
      embed.addFields({ name: "Sample Messages", value: sampleMessages.slice(0, 1024) || "No text content" });
    }

    embed.setFooter({ text: `Channel ID: ${channelId} | Guild: ${guild.name}` }).setTimestamp();

    await sendLog(client, guild.id, "messages", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      channelId,
      channelName,
      details: { count: messages.size, sample: sampleMessages || null, messageIds: [...messages.keys()].slice(0, 20) }
    });
  }
};

export default event;
