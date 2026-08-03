import { SlashCommandBuilder } from 'discord.js';
import ShopItem from '../../models/ShopItem.js';
import { EconomyManager } from '../../systems/economy/economyManager.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('شراء عنصر من المتجر')
        .addStringOption(option =>
            option
                .setName('item_id')
                .setDescription('معرف العنصر')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('quantity')
                .setDescription('الكمية')
                .setRequired(false)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const { guild, user, member, options } = interaction;
        const itemId = options.getString('item_id');
        const quantity = options.getInteger('quantity') || 1;

        try {
            const item = await ShopItem.findOne({
                guildId: guild.id,
                itemId,
                enabled: true
            });

            if (!item) {
                return interaction.reply({
                    embeds: [errorEmbed('العنصر غير موجود')],
                    ephemeral: true
                });
            }

            // Check stock
            if (item.stock > 0 && item.stock < quantity) {
                return interaction.reply({
                    embeds: [errorEmbed(`متوفر فقط ${item.stock} من هذا العنصر`)],
                    ephemeral: true
                });
            }

            const totalPrice = item.price * quantity;

            // Check balance
            const economy = await EconomyManager.getEconomy(guild.id, user.id);
            if (economy.balance < totalPrice) {
                return interaction.reply({
                    embeds: [errorEmbed(
                        `رصيد غير كافٍ!\n\n` +
                        `السعر: ${EconomyManager.formatCurrency(totalPrice)}\n` +
                        `رصيدك: ${EconomyManager.formatCurrency(economy.balance)}`
                    )],
                    ephemeral: true
                });
            }

            // Purchase
            await EconomyManager.removeMoney(guild.id, user.id, totalPrice);

            // Add to inventory (if not a role)
            if (!item.role) {
                await EconomyManager.addItem(guild.id, user.id, item.itemId, item.name, quantity);
            }

            // Give role if applicable
            if (item.role) {
                const role = guild.roles.cache.get(item.role);
                if (role) {
                    await member.roles.add(role);
                }
            }

            // Update stock
            if (item.stock > 0) {
                item.stock -= quantity;
            }
            item.purchases += quantity;
            await item.save();

            const message = `✅ تم شراء **${quantity}x ${item.emoji || '📦'} ${item.name}** بنجاح!\n\n` +
                `💰 المبلغ المدفوع: ${EconomyManager.formatCurrency(totalPrice)}\n` +
                `💵 رصيدك الجديد: ${EconomyManager.formatCurrency(economy.balance - totalPrice)}` +
                (item.role ? `\n🎭 تم إعطاؤك رول ${role?.name || 'Unknown'}!` : '');

            return interaction.reply({
                embeds: [successEmbed(message)]
            });

        } catch (error) {
            console.error('Buy error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء الشراء')],
                ephemeral: true
            });
        }
    },
};
