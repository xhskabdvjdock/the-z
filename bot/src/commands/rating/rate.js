import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import Rating from '../../models/Rating.js';
import Guild from '../../models/Guild.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('تقييم عضو أو خدمة')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('العضو المراد تقييمه')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('rating')
        .setDescription('التقييم (1-5)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    )
    .addStringOption(option =>
      option
        .setName('comment')
        .setDescription('تعليق (اختياري)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { guild, member, options } = interaction;
    const target = options.getUser('user');
    const rating = options.getInteger('rating');
    const comment = options.getString('comment');

    try {
      const guildData = await Guild.findOne({ guildId: guild.id });
      if (!guildData || !guildData.rating.enabled) {
        return interaction.reply({ 
          embeds: [errorEmbed('نظام التقييم غير مفعّل')], 
          ephemeral: true 
        });
      }

      if (target.id === member.id) {
        return interaction.reply({ 
          embeds: [errorEmbed('لا يمكنك تقييم نفسك')], 
          ephemeral: true 
        });
      }

      // Check cooldown
      const lastRating = await Rating.findOne({
        guildId: guild.id,
        ratedBy: member.id,
      }).sort({ timestamp: -1 });

      if (lastRating) {
        const cooldown = guildData.rating.cooldown * 1000;
        const timeLeft = cooldown - (Date.now() - lastRating.timestamp.getTime());
        if (timeLeft > 0) {
          const minutes = Math.ceil(timeLeft / 60000);
          return interaction.reply({ 
            embeds: [errorEmbed(`يجب الانتظار ${minutes} دقيقة قبل التقييم مرة أخرى`)], 
            ephemeral: true 
          });
        }
      }

      // Create rating
      const ratingDoc = new Rating({
        guildId: guild.id,
        userId: target.id,
        ratedBy: member.id,
        rating: rating,
        comment: comment,
      });
      await ratingDoc.save();

      // Get average rating
      const ratings = await Rating.find({ guildId: guild.id, userId: target.id });
      const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      const embed = new EmbedBuilder()
        .setTitle('⭐ تقييم جديد')
        .setDescription(`تم تقييم ${target.tag} بنجاح`)
        .addFields(
          { name: 'التقييم', value: '⭐'.repeat(rating), inline: true },
          { name: 'المتوسط', value: average.toFixed(1), inline: true },
          { name: 'إجمالي التقييمات', value: ratings.length.toString(), inline: true }
        )
        .setColor('#FEE75C')
        .setTimestamp();

      if (comment) {
        embed.addFields({ name: 'التعليق', value: comment, inline: false });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Rate error:', error);
      return interaction.reply({ 
        embeds: [errorEmbed('حدث خطأ أثناء التقييم')], 
        ephemeral: true 
      });
    }
  },
};
