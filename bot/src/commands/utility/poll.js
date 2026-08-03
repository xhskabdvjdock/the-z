import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Poll from '../../models/Poll.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import ms from 'ms';

export default {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('إنشاء استطلاع رأي')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('السؤال')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('options')
                .setDescription('الخيارات مفصولة بفاصلة (مثال: نعم,لا,ربما)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('المدة (مثال: 1h, 30m, 1d)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('multiple')
                .setDescription('السماح باختيار عدة خيارات')
                .setRequired(false)
        ),

    async execute(interaction) {
        const { guild, channel, user, options } = interaction;
        const question = options.getString('question');
        const optionsStr = options.getString('options');
        const durationStr = options.getString('duration');
        const allowMultiple = options.getBoolean('multiple') || false;

        try {
            const optionsList = optionsStr.split(',').map(o => o.trim()).filter(o => o);

            if (optionsList.length < 2) {
                return interaction.reply({
                    embeds: [errorEmbed('يجب أن يكون هناك خياران على الأقل')],
                    ephemeral: true
                });
            }

            if (optionsList.length > 10) {
                return interaction.reply({
                    embeds: [errorEmbed('الحد الأقصى 10 خيارات')],
                    ephemeral: true
                });
            }

            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            let endTime = null;
            if (durationStr) {
                const duration = ms(durationStr);
                if (!duration) {
                    return interaction.reply({
                        embeds: [errorEmbed('مدة غير صحيحة')],
                        ephemeral: true
                    });
                }
                endTime = new Date(Date.now() + duration);
            }

            const pollOptions = optionsList.map((text, i) => ({
                text,
                emoji: emojis[i],
                votes: []
            }));

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${question}`)
                .setColor('#5865F2')
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setDescription(
                    pollOptions.map(opt => `${opt.emoji} ${opt.text}\n**0** أصوات (0%)`).join('\n\n')
                )
                .setFooter({ text: allowMultiple ? 'يمكنك اختيار عدة خيارات' : 'اختر خياراً واحداً' })
                .setTimestamp();

            if (endTime) {
                embed.addFields({ name: 'ينتهي', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>` });
            }

            const buttons = pollOptions.map((opt, i) =>
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(opt.text)
                    .setEmoji(opt.emoji)
                    .setStyle(ButtonStyle.Primary)
            );

            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }

            const message = await channel.send({ embeds: [embed], components: rows });

            const poll = new Poll({
                guildId: guild.id,
                channelId: channel.id,
                messageId: message.id,
                createdBy: user.id,
                question,
                options: pollOptions,
                allowMultiple,
                endTime,
            });

            await poll.save();

            if (endTime) {
                const duration = endTime.getTime() - Date.now();
                setTimeout(async () => {
                    await this.endPoll(poll, message, interaction.client);
                }, duration);
            }

            return interaction.reply({
                embeds: [successEmbed('تم إنشاء الاستطلاع بنجاح!')],
                ephemeral: true
            });

        } catch (error) {
            console.error('Poll error:', error);
            return interaction.reply({
                embeds: [errorEmbed('حدث خطأ')],
                ephemeral: true
            });
        }
    },

    async endPoll(poll, message, client) {
        try {
            poll.ended = true;
            await poll.save();

            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${poll.question} (انتهى)`)
                .setColor('#57F287')
                .setDescription(
                    poll.options.map(opt => {
                        const percentage = totalVotes > 0 ? ((opt.votes.length / totalVotes) * 100).toFixed(1) : 0;
                        const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
                        return `${opt.emoji} **${opt.text}**\n${bar}\n**${opt.votes.length}** أصوات (${percentage}%)`;
                    }).join('\n\n')
                )
                .setFooter({ text: `إجمالي الأصوات: ${totalVotes}` })
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('Error ending poll:', error);
        }
    }
};
