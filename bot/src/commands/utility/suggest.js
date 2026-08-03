import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Suggestion from '../../models/Suggestion.js';
import Guild from '../../models/Guild.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('تقديم اقتراح')
        .addStringOption(option =>
            option
                .setName('suggestion')
                .setDescription('الاقتراح')
                .setRequired(true)
        ),

    async execute(interaction) {
        const { guild, user, options } = interaction;
        const suggestionText = options.getString('suggestion');

        try {
            const guildData = await Guild.findOne({ guildId: guild.id });

            const suggestionChannel = guildData?.suggestions?.channelId
                ? guild.channels.cache.get(guildData.suggestions.channelId)
                : interaction.channel;

            if (!suggestionChannel) {
                return interaction.reply({
                    embeds: [errorEmbed('قناة الاقتراحات غير محددة')],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('💡 اقتراح جديد')
                .setDescription(suggestionText)
                .setColor('#FEE75C')
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL()
                })
                .addFields(
                    { name: '✅ موافق', value: '0', inline: true },
                    { name: '❌ رفض', value: '0', inline: true },
                    { name: 'الحالة', value: '⏳ قيد المراجعة', inline: true }
                )
                .setFooter({ text: `ID: ${user.id}` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suggestion_upvote')
                        .setLabel('موافق')
                        .setEmoji('✅')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('suggestion_downvote')
                        .setLabel('رفض')
                        .setEmoji('❌')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await suggestionChannel.send({
                embeds: [embed],
                components: [row]
            });

            const suggestion = new Suggestion({
                guildId: guild.id,
                messageId: message.id,
                channelId: suggestionChannel.id,
                userId: user.id,
                suggestion: suggestionText,
            });

            await suggestion.save();

            return interaction.reply({
                embeds: [successEmbed(`تم إرسال اقتراحك بنجاح في ${suggestionChannel}!`)],
                ephemeral: true
            });

        } catch (error) {
            console.error('Suggest error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء إرسال الاقتراح')],
                ephemeral: true
            });
        }
    },
};
