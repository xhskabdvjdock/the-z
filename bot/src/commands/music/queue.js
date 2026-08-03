import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { MusicManager } from '../../systems/music/musicManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('عرض قائمة الانتظار'),

  async execute(interaction) {
    const { guild } = interaction;

    try {
      const player = interaction.client.player;
      if (!player) {
        return interaction.reply({ 
          embeds: [errorEmbed('نظام الموسيقى غير متاح')], 
          ephemeral: true 
        });
      }
      const queue = player.nodes.get(guild.id);

      if (!queue || queue.tracks.size === 0) {
        return interaction.reply({ 
          embeds: [errorEmbed('القائمة فارغة')], 
          ephemeral: true 
        });
      }

      const tracks = queue.tracks.toArray().slice(0, 10);
      const embed = new EmbedBuilder()
        .setTitle('📋 قائمة الانتظار')
        .setDescription(
          tracks.map((track, index) => 
            `\`${index + 1}.\` [${track.title}](${track.url}) - ${track.duration}`
          ).join('\n')
        )
        .setColor('#5865F2')
        .setFooter({ text: `إجمالي: ${queue.tracks.size} أغنية` });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Queue error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء جلب القائمة')], 
        ephemeral: true 
      });
    }
  },
};
