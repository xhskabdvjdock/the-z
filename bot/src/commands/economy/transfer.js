import { SlashCommandBuilder } from 'discord.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('حوّل أموال لعضو آخر')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المراد التحويل له')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('المبلغ المراد تحويله')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const { guild, user, options } = interaction;
        const targetUser = options.getUser('user');
        const amount = options.getInteger('amount');

        try {
            if (targetUser.bot) {
                return interaction.reply({
                    embeds: [errorEmbed('لا يمكنك التحويل للبوتات')],
                    ephemeral: true
                });
            }

            const result = await EconomyManager.transfer(guild.id, user.id, targetUser.id, amount);

            if (result.error) {
                return interaction.reply({
                    embeds: [errorEmbed(result.error)],
                    ephemeral: true
                });
            }

            const message = `✅ تم تحويل ${EconomyManager.formatCurrency(amount)} إلى ${targetUser}!\n\n` +
                `💵 رصيدك الجديد: ${EconomyManager.formatCurrency(result.fromEconomy.balance)}`;

            return interaction.reply({
                embeds: [successEmbed(message)]
            });
        } catch (error) {
            console.error('Transfer error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء التحويل')],
                ephemeral: true
            });
        }
    },
};
