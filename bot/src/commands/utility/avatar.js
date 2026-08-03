import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('عرض صورة البروفايل')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المراد عرض صورته')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const avatarURL = targetUser.displayAvatarURL({ size: 4096, dynamic: true });

            const embed = {
                title: `🖼️ صورة ${targetUser.username}`,
                color: 0x5865F2,
                image: { url: avatarURL },
                footer: { text: `طلب بواسطة ${interaction.user.tag}` },
                timestamp: new Date().toISOString()
            };

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Avatar error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
