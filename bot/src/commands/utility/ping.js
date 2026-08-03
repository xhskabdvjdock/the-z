import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('قياس سرعة استجابة البوت'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: '🏓 جاري القياس...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: `🏓 **Pong!**\n\n` +
                `📊 **زمن الاستجابة:** ${latency}ms\n` +
                `💓 **API Latency:** ${apiLatency}ms`
        });
    },
};
