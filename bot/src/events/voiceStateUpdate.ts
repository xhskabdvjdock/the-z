import { EmbedBuilder, VoiceState } from "discord.js";
import { BotEvent } from "../types/event";
import { sendLog } from "../modules/logging/logger";

const event: BotEvent = {
  name: "voiceStateUpdate",
  async execute(client, oldState: VoiceState, newState: VoiceState) {
    if (!newState.guild) return;

    const member = newState.member;
    if (!member) return;

    const changes: string[] = [];

    // Join/Leave channel
    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channel) {
        changes.push(`Joined: ${newState.channel.name}`);
      } else if (oldState.channel && !newState.channelId) {
        changes.push(`Left: ${oldState.channel.name}`);
      } else if (oldState.channel && newState.channel) {
        changes.push(`Moved: ${oldState.channel.name} → ${newState.channel.name}`);
      }
    }

    // Mute/Unmute
    if (oldState.serverMute !== newState.serverMute) {
      changes.push(newState.serverMute ? "Server Muted" : "Server Unmuted");
    }

    // Deafen/Undeafen
    if (oldState.serverDeaf !== newState.serverDeaf) {
      changes.push(newState.serverDeaf ? "Server Deafened" : "Server Undeafened");
    }

    // Self Mute/Unmute
    if (oldState.selfMute !== newState.selfMute) {
      changes.push(newState.selfMute ? "Self Muted" : "Self Unmuted");
    }

    // Self Deafen/Undeafen
    if (oldState.selfDeaf !== newState.selfDeaf) {
      changes.push(newState.selfDeaf ? "Self Deafened" : "Self Undeafened");
    }

    // Screen Share
    if (oldState.streaming !== newState.streaming) {
      changes.push(newState.streaming ? "Started Screen Share" : "Stopped Screen Share");
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("Voice State Updated")
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.id})`, inline: true }
      );

    changes.forEach((change, index) => {
      embed.addFields({ name: `Change ${index + 1}`, value: change });
    });

    embed.setFooter({ text: `User ID: ${member.id}` });
    embed.setTimestamp();

    await sendLog(client, newState.guild.id, "voice", embed);
  }
};

export default event;
