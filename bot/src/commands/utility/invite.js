import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('الحصول على رابط دعوة البوت'),

    async execute(interaction) {
        const { client } = interaction;

        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        return interaction.reply({
            embeds: [successEmbed(
                `🔗 **رابط دعوة البوت:**\n\n` +
                `[اضغط هنا لإضافة البوت](${inviteUrl})\n\n` +
                `شكراً لاستخدامك البوت! 💙`
            )],
            ephemeral: true
        });
    },
};
