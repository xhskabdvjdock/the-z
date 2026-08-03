import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('حذف عدد من الرسائل (alias لـ purge)')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('عدد الرسائل')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        try {
            await interaction.deferReply({ ephemeral: true });

            const deleted = await interaction.channel.bulkDelete(amount, true);

            return interaction.editReply({
                embeds: [successEmbed(`تم حذف ${deleted.size} رسالة بنجاح`)]
            });

        } catch (error) {
            console.error('Clear error:', error);
            return interaction.editReply({
                content: 'حدث خطأ أثناء حذف الرسائل'
            });
        }
    },
};
