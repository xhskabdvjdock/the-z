import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

const responses = [
    'نعم بالتأكيد',
    'من غير شك',
    'بالتأكيد نعم',
    'يمكنك الاعتماد على ذلك',
    'كما أراه، نعم',
    'على الأرجح',
    'نظرة جيدة',
    'نعم',
    'العلامات تشير إلى نعم',
    'ردي هو لا',
    'مصادري تقول لا',
    'توقعاتي ليست جيدة',
    'مشكوك فيه جداً',
    'لا تعتمد على ذلك',
    'سؤالي مرة أخرى لاحقاً',
    'اسألني لاحقاً',
    'من الأفضل ألا أخبرك الآن',
    'لا يمكن التنبؤ الآن',
    'ركز واسأل مرة أخرى'
];

export default {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('اسأل كرة السحر سؤالاً')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('سؤالك')
                .setRequired(true)
        ),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const response = responses[Math.floor(Math.random() * responses.length)];

        return interaction.reply({
            embeds: [successEmbed(`🔮 **السؤال:** ${question}\n\n**الجواب:** ${response}`)]
        });
    },
};
