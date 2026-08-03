import { Player } from 'discord-player';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Music from '../../models/Music.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export class MusicManager {
  static players = new Map();

  static getPlayer(guildId) {
    if (!this.players.has(guildId)) {
      // Player will be initialized in the command
    }
    return this.players.get(guildId);
  }

  static setPlayer(guildId, player) {
    this.players.set(guildId, player);
  }

  static async getQueue(guildId) {
    try {
      let musicData = await Music.findOne({ guildId });
      if (!musicData) {
        musicData = new Music({ guildId });
        await musicData.save();
      }
      return musicData;
    } catch (error) {
      logger.error('Error getting queue:', error);
      return null;
    }
  }

  static async updateQueue(guildId, queue, currentTrack, isPlaying, isPaused) {
    try {
      await Music.findOneAndUpdate(
        { guildId },
        {
          queue: queue.map(track => ({
            title: track.title,
            url: track.url,
            duration: track.duration,
            requestedBy: track.requestedBy,
            thumbnail: track.thumbnail,
          })),
          currentTrack: currentTrack ? {
            title: currentTrack.title,
            url: currentTrack.url,
            duration: currentTrack.duration,
            requestedBy: currentTrack.requestedBy,
            thumbnail: currentTrack.thumbnail,
            position: currentTrack.position || 0,
          } : null,
          isPlaying,
          isPaused,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Error updating queue:', error);
    }
  }

  static createNowPlayingEmbed(track, queue, position) {
    const embed = new EmbedBuilder()
      .setTitle('🎵 الآن يتم التشغيل')
      .setDescription(`[${track.title}](${track.url})`)
      .setThumbnail(track.thumbnail)
      .setColor('#5865F2')
      .addFields(
        { name: 'المدة', value: track.duration || 'غير معروف', inline: true },
        { name: 'الطلب من', value: `<@${track.requestedBy}>`, inline: true },
        { name: 'في القائمة', value: `${queue.length} أغنية`, inline: true }
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setLabel('⏸️ إيقاف')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_resume')
          .setLabel('▶️ استئناف')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setLabel('⏭️ تخطي')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setLabel('⏹️ إيقاف')
          .setStyle(ButtonStyle.Danger)
      );

    return { embeds: [embed], components: [row] };
  }
}
