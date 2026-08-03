import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

const triviaQuestions = [
    {
        question: 'ما هي عاصمة فرنسا؟',
        options: ['باريس', 'لندن', 'برلين', 'روما'],
        correct: 0
    },
    {
        question: 'كم عدد الكواكب في النظام الشمسي؟',
        options: ['7', '8', '9', '10'],
        correct: 1
    },
    {
        question: 'ما هو أكبر محيط في العالم؟',
        options: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد'],
        correct: 2
    },
    {
        question: 'من كتب ملحمة الإلياذة؟',
        options: ['سقراط', 'هوميروس', 'أفلاطون', 'أرسطو'],
        correct: 1
    },
    {
        question: 'كم عدد قارات العالم؟',
        options: ['5', '6', '7', '8'],
        correct: 2
    }
];

export default {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('سؤال ثقافي عشوائي'),

    async execute(interaction) {
        const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

        const optionsText = question.options.map((opt, i) =>
            `${i + 1}. ${opt}`
        ).join('\n');

        await interaction.reply({
            embeds: [successEmbed(
                `**❓ ${question.question}**\n\n${optionsText}\n\nأرسل رقم الإجابة خلال 15 ثانية!`
            )]
        });

        const filter = m => m.author.id === interaction.user.id && /^[1-4]$/.test(m.content);

        try {
            const collected = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 15000,
                errors: ['time']
            });

            const answer = parseInt(collected.first().content) - 1;

            if (answer === question.correct) {
                await interaction.followUp({
                    embeds: [successEmbed(`✅ إجابة صحيحة! 🎉`)]
                });
            } else {
                await interaction.followUp({
                    embeds: [successEmbed(
                        `❌ إجابة خاطئة!\n\nالإجابة الصحيحة: **${question.options[question.correct]}**`
                    )]
                });
            }
        } catch (error) {
            await interaction.followUp({
                embeds: [successEmbed('⏰ انتهى الوقت! لم تجب في الوقت المحدد.')]
            });
        }
    },
};
