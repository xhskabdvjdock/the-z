import { SlashCommandBuilder } from 'discord.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('احصل على مكافأتك اليومية'),

    async execute(interaction) {
        const { guild, user } = interaction;

        try {
            const result = await EconomyManager.claimDaily(guild.id, user.id);

            if (result.error) {
                return interaction.reply({
                    embeds: [errorEmbed(result.error)],
                    ephemeral: true
                });
            }

            const { economy, reward, streak } = result;

            const message = `✅ تم استلام مكافأتك اليومية!\n\n` +
                `💰 المكافأة: ${EconomyManager.formatCurrency(reward)}\n` +
                `🔥 السلسلة: ${streak} ${streak === 1 ? 'يوم' : 'أيام'}\n` +
                `💵 الرصيد الجديد: ${EconomyManager.formatCurrency(economy.balance)}`;

            return interaction.reply({
                embeds: [successEmbed(message)]
            });
        } catch (error) {
            console.error('Daily error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء استلام المكافأة')],
                ephemeral: true
            });
        }
    },
};
