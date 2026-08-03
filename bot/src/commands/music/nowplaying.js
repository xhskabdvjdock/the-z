import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('عرض الأغنية الحالية'),

    async execute(interaction) {
        const { guild } = interaction;

        try {
            const player = interaction.client.player;
            const queue = player?.nodes.get(guild.id);

            if (!queue || !queue.currentTrack) {
                return interaction.reply({
                    embeds: [errorEmbed('لا توجد موسيقى قيد التشغيل')],
                    ephemeral: true
                });
            }

            const track = queue.currentTrack;
            const progress = queue.node.createProgressBar();

            const embed = new EmbedBuilder()
                .setTitle('🎵 الآن يتم التشغيل')
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.thumbnail)
                .setColor('#5865F2')
                .addFields(
                    { name: 'المدة', value: track.duration, inline: true },
                    { name: 'الطلب من', value: `<@${track.requestedBy?.id}>`, inline: true },
                    { name: 'مستوى الصوت', value: `${queue.node.volume}%`, inline: true },
                    { name: 'التقدم', value: progress, inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Now playing error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
