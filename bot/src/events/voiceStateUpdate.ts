import { AuditLogEvent, EmbedBuilder, VoiceState } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";
import { getGuildConfig } from "../utils/guildConfig";
import { handleVoiceStateUpdate as handleTempVoiceUpdate } from "../modules/tempVoice/voiceManager";
import { scheduleReconcile } from "../modules/alwaysVoice/alwaysVoiceManager";

const event: BotEvent = {
  name: "voiceStateUpdate",
  async execute(client, oldState: VoiceState, newState: VoiceState) {
    if (!newState.guild) return;
    if (newState.member?.id === client.user?.id) {
      scheduleReconcile(client, newState.guild.id);
    }
    const member = newState.member;
    if (!member) return;

    const gConfig = await getGuildConfig(client, newState.guild.id);
    await handleTempVoiceUpdate(client, oldState, newState, gConfig);

    const changes: string[] = [];
    const details: any = {};
    let executor: any = null;

    // Detect mute/deafen by moderator via audit log
    if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
      try {
        const audit = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
        const entry = audit.entries.find((e) => (e.target as any)?.id === member.id && Date.now() - e.createdTimestamp < 10000);
        executor = entry?.executor || null;
      } catch {}
    }

    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channel) {
        changes.push(`Joined: <#${newState.channel.id}> \`${newState.channel.name}\``);
        details.joined = { channelId: newState.channel.id, channelName: newState.channel.name };
      } else if (oldState.channel && !newState.channelId) {
        changes.push(`Left: \`${oldState.channel.name}\` (\`${oldState.channel.id}\`)`);
        details.left = { channelId: oldState.channel.id, channelName: oldState.channel.name };
      } else if (oldState.channel && newState.channel) {
        changes.push(`Moved: \`${oldState.channel.name}\` -> <#${newState.channel.id}> \`${newState.channel.name}\``);
        details.moved = { from: oldState.channel.id, to: newState.channel.id };
      }
    }
    if (oldState.serverMute !== newState.serverMute) {
      changes.push(newState.serverMute ? "Server Muted" : "Server Unmuted");
      details.serverMute = newState.serverMute;
    }
    if (oldState.serverDeaf !== newState.serverDeaf) {
      changes.push(newState.serverDeaf ? "Server Deafened" : "Server Undeafened");
      details.serverDeaf = newState.serverDeaf;
    }
    if (oldState.selfMute !== newState.selfMute) {
      changes.push(newState.selfMute ? "Self Muted" : "Self Unmuted");
      details.selfMute = newState.selfMute;
    }
    if (oldState.selfDeaf !== newState.selfDeaf) {
      changes.push(newState.selfDeaf ? "Self Deafened" : "Self Undeafened");
      details.selfDeaf = newState.selfDeaf;
    }
    if (oldState.streaming !== newState.streaming) {
      changes.push(newState.streaming ? "Started Screen Share" : "Stopped Screen Share");
      details.streaming = newState.streaming;
    }
    if (oldState.selfVideo !== newState.selfVideo) {
      changes.push(newState.selfVideo ? "Camera On" : "Camera Off");
      details.selfVideo = newState.selfVideo;
    }

    if (changes.length === 0) return;

    const nowUnix = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Voice State Updated")
      .addFields(
        { name: "User", value: `${member.user.tag} <@${member.id}> (\`${member.id}\`)`, inline: false },
        { name: "Time", value: `<t:${nowUnix}:F> (<t:${nowUnix}:R>)`, inline: true }
      );
    if (executor) {
      embed.addFields({ name: "Moderator", value: `${executor.tag} <@${executor.id}>`, inline: true });
    }
    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change.slice(0, 1024) });
    });
    embed.setFooter({ text: `User ID: ${member.id} | Guild: ${newState.guild.name}` }).setTimestamp();

    const activeChannelId = newState.channelId || oldState.channelId || undefined;
    const activeChannelName = (newState.channel as any)?.name || (oldState.channel as any)?.name || undefined;

    await sendLog(client, newState.guild.id, "voice", embed, undefined, {
      executorId: executor?.id,
      executorTag: executor?.tag,
      targetId: member.id,
      targetTag: member.user.tag,
      channelId: activeChannelId,
      channelName: activeChannelName,
      details
    });
  }
};

export default event;
