import { AuditLogEvent, EmbedBuilder, Channel } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "channelUpdate",
  async execute(client, oldChannel: Channel, newChannel: Channel) {
    if (!("guild" in newChannel) || !newChannel.guild) return;

    const changes: string[] = [];
    const before: any = {};
    const after: any = {};

    if ("name" in oldChannel && "name" in newChannel && oldChannel.name !== newChannel.name) {
      changes.push(`Name: \`${oldChannel.name}\` -> \`${newChannel.name}\``);
      before.name = oldChannel.name;
      after.name = newChannel.name;
    }
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push(`Topic: ${oldChannel.topic || "None"} -> ${newChannel.topic || "None"}`);
      before.topic = oldChannel.topic;
      after.topic = newChannel.topic;
    }
    if ("rateLimitPerUser" in oldChannel && "rateLimitPerUser" in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`Slowmode: ${oldChannel.rateLimitPerUser}s -> ${newChannel.rateLimitPerUser}s`);
      before.slowmode = oldChannel.rateLimitPerUser;
      after.slowmode = newChannel.rateLimitPerUser;
    }
    if ("nsfw" in oldChannel && "nsfw" in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`NSFW: ${oldChannel.nsfw ? "Yes" : "No"} -> ${newChannel.nsfw ? "Yes" : "No"}`);
      before.nsfw = oldChannel.nsfw;
      after.nsfw = newChannel.nsfw;
    }
    if ("parentId" in oldChannel && "parentId" in newChannel && (oldChannel as any).parentId !== (newChannel as any).parentId) {
      changes.push(`Parent: ${(oldChannel as any).parentId || "None"} -> ${(newChannel as any).parentId || "None"}`);
      before.parentId = (oldChannel as any).parentId;
      after.parentId = (newChannel as any).parentId;
    }

    if (changes.length === 0) return;

    let executor: any = null;
    try {
      const audit = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 5 });
      executor = audit.entries.find((e) => (e.target as any)?.id === newChannel.id && Date.now() - e.createdTimestamp < 10000)?.executor || null;
    } catch {}

    const channelName = "name" in newChannel ? (newChannel as any).name : "Unknown";
    const nowUnix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Channel Updated")
      .addFields(
        { name: "Channel", value: `<#${newChannel.id}> \`${channelName}\` (\`${newChannel.id}\`)`, inline: false },
        { name: "Updated By", value: executor ? `${executor.tag} <@${executor.id}>` : "Unknown", inline: true },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `Channel ID: ${newChannel.id}` }).setTimestamp();

    await sendLog(client, newChannel.guild.id, "channels", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      channelId: newChannel.id,
      channelName,
      before,
      after,
      details: { changes }
    });
  }
};

export default event;
