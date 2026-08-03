import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('عرض لوحة المتصدرين')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('نوع اللوحة')
                .setRequired(false)
                .addChoices(
                    { name: 'الاقتصاد', value: 'economy' },
                    { name: 'المستويات', value: 'levels' }
                )
        ),

    async execute(interaction) {
        const { guild, options } = interaction;
        const type = options.getString('type') || 'economy';

        try {
            if (type === 'economy') {
                await interaction.deferReply();

                const leaderboard = await EconomyManager.getLeaderboard(guild.id, 10);

                if (!leaderboard.length) {
                    return interaction.editReply({
                        embeds: [errorEmbed('لا توجد بيانات')]
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 لوحة المتصدرين - الاقتصاد')
                    .setColor('#FFD700')
                    .setTimestamp();

                const medals = ['🥇', '🥈', '🥉'];
                let description = '';

                for (let i = 0; i < leaderboard.length; i++) {
                    const entry = leaderboard[i];
                    const medal = medals[i] || `**${i + 1}.**`;

                    try {
                        const user = await interaction.client.users.fetch(entry.userId);
                        description += `${medal} ${user.tag}\n`;
                        description += `   💰 ${EconomyManager.formatCurrency(entry.balance)}\n\n`;
                    } catch (error) {
                        // User not found, skip
                    }
                }

                embed.setDescription(description || 'لا توجد بيانات');

                return interaction.editReply({ embeds: [embed] });
            }

            // For now, economy only. Levels will be added later
            return interaction.reply({
                embeds: [errorEmbed('لوحة المستويات قيد التطوير')],
                ephemeral: true
            });

        } catch (error) {
            console.error('Leaderboard error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء عرض اللوحة')],
                ephemeral: true
            });
        }
    },
};
