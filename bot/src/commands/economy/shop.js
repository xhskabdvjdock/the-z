import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import ShopItem from '../../models/ShopItem.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('عرض المتجر'),

    async execute(interaction) {
        const { guild } = interaction;

        try {
            const items = await ShopItem.find({ guildId: guild.id, enabled: true }).sort({ price: 1 });

            if (!items.length) {
                return interaction.reply({
                    embeds: [errorEmbed('المتجر فارغ حالياً')],
                    ephemeral: true
                });
            }

            const categories = {};
            items.forEach(item => {
                const cat = item.category || 'أخرى';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            });

            const embed = new EmbedBuilder()
                .setTitle('🛒 المتجر')
                .setColor('#5865F2')
                .setDescription('استخدم `/buy <item_id>` للشراء')
                .setTimestamp();

            for (const [category, catItems] of Object.entries(categories)) {
                const itemsText = catItems.map(item =>
                    `${item.emoji || '📦'} **${item.name}** - 💰 ${item.price}\n` +
                    `   └ ${item.description || 'لا يوجد وصف'}\n` +
                    `   └ ID: \`${item.itemId}\`` +
                    (item.stock > 0 ? ` | متوفر: ${item.stock}` : '') +
                    (item.role ? ` | 🎭 Role` : '')
                ).join('\n\n');

                embed.addFields({ name: `📂 ${category}`, value: itemsText, inline: false });
            }

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Shop error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },
};
