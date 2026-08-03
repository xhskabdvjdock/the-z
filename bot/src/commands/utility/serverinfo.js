import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('عرض معلومات السيرفر'),

    async execute(interaction) {
        const { guild } = interaction;

        try {
            const owner = await guild.fetchOwner();
            const channels = guild.channels.cache;
            const roles = guild.roles.cache;

            const embed = new EmbedBuilder()
                .setTitle(`📊 معلومات ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setColor('#5865F2')
                .addFields(
                    { name: '🆔 المعرف', value: guild.id, inline: true },
                    { name: '👑 المالك', value: owner.user.tag, inline: true },
                    { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 الأعضاء', value: guild.memberCount.toString(), inline: true },
                    { name: '📝 القنوات', value: channels.size.toString(), inline: true },
                    { name: '🎭 الرولات', value: roles.size.toString(), inline: true },
                    { name: '😊 الإيموجي', value: guild.emojis.cache.size.toString(), inline: true },
                    { name: '🚀 Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
                    { name: '💎 Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
                )
                .setTimestamp();

            if (guild.description) {
                embed.setDescription(guild.description);
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Serverinfo error:', error);
            return interaction.reply({
                content: 'حدث خطأ أثناء جلب المعلومات',
                ephemeral: true
            });
        }
    },
};
