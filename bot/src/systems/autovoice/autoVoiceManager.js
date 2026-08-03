import { ChannelType, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export class AutoVoiceManager {
  static voiceChannels = new Map();

  static async handleVoiceStateUpdate(oldState, newState, client) {
    try {
      const guildData = await Guild.findOne({ guildId: newState.guild.id });
      if (!guildData || !guildData.autovoice.enabled) return;

      const autovoice = guildData.autovoice;
      const channel = newState.guild.channels.cache.get(autovoice.channelId);
      if (!channel) return;

      // User joined the auto voice channel
      if (newState.channelId === channel.id && !oldState.channelId) {
        await this.createVoiceChannel(newState.member, newState.guild, autovoice, client);
      }

      // User left their voice channel
      if (oldState.channelId && oldState.channelId !== channel.id) {
        const voiceChannel = newState.guild.channels.cache.get(oldState.channelId);
        if (voiceChannel && this.voiceChannels.has(voiceChannel.id)) {
          // Check if channel is empty
          if (voiceChannel.members.size === 0) {
            await voiceChannel.delete().catch(() => {});
            this.voiceChannels.delete(voiceChannel.id);
          }
        }
      }
    } catch (error) {
      logger.error('Error handling voice state update:', error);
    }
  }

  static async createVoiceChannel(member, guild, config, client) {
    try {
      const name = this.replaceVariables(config.nameFormat || '{username}', member);
      const category = guild.channels.cache.get(config.channelId)?.parent;

      const voiceChannel = await guild.channels.create({
        name: name,
        type: ChannelType.GuildVoice,
        parent: category?.id,
        userLimit: config.userLimit || 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.ManageChannels,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      // Move member to new channel
      await member.voice.setChannel(voiceChannel);

      // Lock channel if configured
      if (config.locked) {
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: false,
        });
      }

      this.voiceChannels.set(voiceChannel.id, {
        ownerId: member.id,
        createdAt: Date.now(),
      });

      logger.debug(`Created auto voice channel: ${voiceChannel.name}`);
    } catch (error) {
      logger.error('Error creating voice channel:', error);
    }
  }

  static replaceVariables(text, member) {
    return text
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag);
  }
}
