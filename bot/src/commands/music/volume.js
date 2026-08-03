import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('تغيير مستوى الصوت')
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('المستوى (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const { guild, member } = interaction;
        const volume = interaction.options.getInteger('level');

        try {
            if (!member.voice.channel) {
                return interaction.reply({
                    embeds: [errorEmbed('يجب أن تكون في روم صوتي')],
                    ephemeral: true
                });
            }

            const player = interaction.client.player;
            const queue = player?.nodes.get(guild.id);

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({
                    embeds: [errorEmbed('لا توجد موسيقى قيد التشغيل')],
                    ephemeral: true
                });
            }

            queue.node.setVolume(volume);

            return interaction.reply({
                embeds: [successEmbed(`🔊 تم تغيير مستوى الصوت إلى **${volume}%**`)]
            });

        } catch (error) {
            console.error('Volume error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
