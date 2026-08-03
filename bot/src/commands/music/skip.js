import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { MusicManager } from '../../systems/music/musicManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('تخطي الأغنية الحالية'),

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

      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ 
          embeds: [errorEmbed('لا توجد موسيقى قيد التشغيل')], 
          ephemeral: true 
        });
      }

      queue.node.skip();
      return interaction.reply({ 
        embeds: [successEmbed('تم تخطي الأغنية')] 
      });
    } catch (error) {
      console.error('Skip error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء تخطي الأغنية')], 
        ephemeral: true 
      });
    }
  },
};
