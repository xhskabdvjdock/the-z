import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('رمي عملة'),

    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'صورة' : 'كتابة';
        const emoji = result === 'صورة' ? '🪙' : '📝';

        return interaction.reply({
            embeds: [successEmbed(`${emoji} النتيجة: **${result}**!`)]
        });
    },
};
