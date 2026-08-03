import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('عرض رصيدك أو رصيد عضو آخر')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المراد عرض رصيده')
                .setRequired(false)
        ),

    async execute(interaction) {
        const { guild, user, options } = interaction;
        const targetUser = options.getUser('user') || user;

        try {
            const economy = await EconomyManager.getEconomy(guild.id, targetUser.id);

            if (!economy) {
                return interaction.reply({
                    embeds: [errorEmbed('حدث خطأ في جلب البيانات')],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`💰 رصيد ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor('#FFD700')
                .addFields(
                    {
                        name: '💵 المحفظة',
                        value: EconomyManager.formatCurrency(economy.balance),
                        inline: true
                    },
                    {
                        name: '🏦 البنك',
                        value: EconomyManager.formatCurrency(economy.bank),
                        inline: true
                    },
                    {
                        name: '💎 المجموع',
                        value: EconomyManager.formatCurrency(economy.balance + economy.bank),
                        inline: true
                    },
                    {
                        name: '📊 الإحصائيات',
                        value: `📈 إجمالي الأرباح: ${EconomyManager.formatCurrency(economy.totalEarned)}\n📉 إجمالي المصروفات: ${EconomyManager.formatCurrency(economy.totalSpent)}\n🔥 سلسلة يومية: ${economy.dailyStreak || 0} يوم`,
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Balance error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء عرض الرصيد')],
                ephemeral: true
            });
        }
    },
};
