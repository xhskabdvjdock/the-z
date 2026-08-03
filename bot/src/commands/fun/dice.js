import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('رمي نرد')
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('عدد أوجه النرد')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const sides = interaction.options.getInteger('sides') || 6;
        const result = Math.floor(Math.random() * sides) + 1;

        return interaction.reply({
            embeds: [successEmbed(`🎲 رميت نرد بـ ${sides} أوجه...\n\n**النتيجة:** ${result}`)]
        });
    },
};
