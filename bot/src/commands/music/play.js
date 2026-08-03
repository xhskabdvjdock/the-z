import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { MusicManager } from '../../systems/music/musicManager.js';
import Guild from '../../models/Guild.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('تشغيل موسيقى')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('اسم الأغنية أو الرابط')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const query = options.getString('query');

    try {
      if (!member.voice.channel) {
        return interaction.reply({ 
          embeds: [errorEmbed('يجب أن تكون في روم صوتي')], 
          ephemeral: true 
        });
      }

      const guildData = await Guild.findOne({ guildId: guild.id });
      if (!guildData || !guildData.music?.enabled) {
        return interaction.reply({ 
          embeds: [errorEmbed('نظام الموسيقى غير مفعّل')], 
          ephemeral: true 
        });
      }

      await interaction.deferReply();

      const player = interaction.client.player;
      if (!player) {
        return interaction.editReply({ 
          embeds: [errorEmbed('نظام الموسيقى غير متاح حالياً')] 
        });
      }

      // Get or create queue
      let queue = player.nodes.get(guild.id);
      if (!queue) {
        queue = player.nodes.create(guild.id, {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: member.user,
          },
          selfDeaf: true,
          volume: guildData.music?.defaultVolume || 50,
        });
      }

      // Connect to voice channel if not connected
      if (!queue.connection) {
        await queue.connect(member.voice.channel);
      }

      // Search for the track
      const searchResult = await player.search(query, {
        requestedBy: member.user,
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply({ 
          embeds: [errorEmbed('لم يتم العثور على نتائج')] 
        });
      }

      const track = searchResult.tracks[0];
      
      // Add track to queue
      if (queue.isPlaying()) {
        queue.addTrack(track);
        await interaction.editReply({ 
          embeds: [successEmbed(`تمت إضافة "${track.title}" إلى القائمة`)] 
        });
      } else {
        queue.addTrack(track);
        await queue.node.play();
        
        const queueData = queue.tracks.toArray().map(t => ({
          title: t.title,
          url: t.url,
          duration: t.duration,
          requestedBy: t.requestedBy?.id,
          thumbnail: t.thumbnail,
        }));

        await MusicManager.updateQueue(
          guild.id,
          queueData,
          {
            title: track.title,
            url: track.url,
            duration: track.duration,
            requestedBy: member.id,
            thumbnail: track.thumbnail,
          },
          true,
          false
        );

        const nowPlaying = MusicManager.createNowPlayingEmbed(
          {
            title: track.title,
            url: track.url,
            duration: track.duration,
            requestedBy: member.id,
            thumbnail: track.thumbnail,
          },
          queueData,
          0
        );

        await interaction.editReply(nowPlaying);
      }
    } catch (error) {
      console.error('Play error:', error);
      const errorMessage = error.message || 'حدث خطأ أثناء تشغيل الموسيقى';
      return interaction.editReply({ 
        embeds: [errorEmbed(errorMessage)] 
      });
    }
  },
};
