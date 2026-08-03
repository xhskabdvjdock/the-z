import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('خلط القائمة عشوائياً'),

    async execute(interaction) {
        const { guild, member } = interaction;

        try {
            if (!member.voice.channel) {
                return interaction.reply({
                    embeds: [errorEmbed('يجب أن تكون في روم صوتي')],
                    ephemeral: true
                });
            }

            const player = interaction.client.player;
            const queue = player?.nodes.get(guild.id);

            if (!queue || !queue.tracks.size) {
                return interaction.reply({
                    embeds: [errorEmbed('القائمة فارغة')],
                    ephemeral: true
                });
            }

            queue.tracks.shuffle();

            return interaction.reply({
                embeds: [successEmbed('🔀 تم خلط القائمة بنجاح!')]
            });

        } catch (error) {
            console.error('Shuffle error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
