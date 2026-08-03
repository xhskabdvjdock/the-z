import { SlashCommandBuilder } from 'discord.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('اعمل واكسب المال'),

    async execute(interaction) {
        const { guild, user } = interaction;

        try {
            const result = await EconomyManager.work(guild.id, user.id);

            if (result.error) {
                return interaction.reply({
                    embeds: [errorEmbed(result.error)],
                    ephemeral: true
                });
            }

            const { economy, earnings, job } = result;

            const message = `✅ عملت كـ **${job}** وكسبت ${EconomyManager.formatCurrency(earnings)}!\n\n` +
                `💵 الرصيد الجديد: ${EconomyManager.formatCurrency(economy.balance)}`;

            return interaction.reply({
                embeds: [successEmbed(message)]
            });
        } catch (error) {
            console.error('Work error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء العمل')],
                ephemeral: true
            });
        }
    },
};
