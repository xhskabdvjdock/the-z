import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('العب حجر ورقة مقص مع البوت')
        .addStringOption(option =>
            option
                .setName('choice')
                .setDescription('اختيارك')
                .setRequired(true)
                .addChoices(
                    { name: '🪨 حجر', value: 'rock' },
                    { name: '📄 ورقة', value: 'paper' },
                    { name: '✂️ مقص', value: 'scissors' }
                )
        ),

    async execute(interaction) {
        const userChoice = interaction.options.getString('choice');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        const emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };

        const names = {
            rock: 'حجر',
            paper: 'ورقة',
            scissors: 'مقص'
        };

        let result;
        if (userChoice === botChoice) {
            result = '🤝 تعادل!';
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = '🎉 فزت!';
        } else {
            result = '😞 خسرت!';
        }

        const message = `**اختيارك:** ${emojis[userChoice]} ${names[userChoice]}\n` +
            `**اختياري:** ${emojis[botChoice]} ${names[botChoice]}\n\n` +
            `**النتيجة:** ${result}`;

        return interaction.reply({
            embeds: [successEmbed(message)]
        });
    },
};
