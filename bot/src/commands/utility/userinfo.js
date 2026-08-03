import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('عرض معلومات عضو')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('العضو المراد عرض معلوماته')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);

        try {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 10);

            const embed = new EmbedBuilder()
                .setTitle(`👤 معلومات ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .setColor(member.displayHexColor || '#5865F2')
                .addFields(
                    { name: '🆔 المعرف', value: targetUser.id, inline: true },
                    { name: '📛 اسم العرض', value: member.displayName, inline: true },
                    { name: '🤖 بوت؟', value: targetUser.bot ? 'نعم' : 'لا', inline: true },
                    { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📥 تاريخ الانضمام', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: `🎭 الرولات [${member.roles.cache.size - 1}]`, value: roles.length ? roles.join(', ') : 'لا يوجد', inline: false }
                )
                .setFooter({ text: `طلب بواسطة ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Userinfo error:', error);
            return interaction.reply({
                content: 'حدث خطأ أثناء جلب المعلومات',
                ephemeral: true
            });
        }
    },
};
