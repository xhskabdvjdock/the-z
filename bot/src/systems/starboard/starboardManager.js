import { EmbedBuilder } from 'discord.js';
import Starboard from '../../models/Starboard.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export class StarboardManager {
    static async handleStar(reaction, user, added = true) {
        try {
            if (reaction.emoji.name !== '⭐') return;
            if (user.bot) return;

            const { message, client } = reaction;
            const guildData = await Guild.findOne({ guildId: message.guild.id });

            if (!guildData?.starboard?.enabled) return;

            const starboardChannelId = guildData.starboard.channelId;
            const threshold = guildData.starboard.threshold || 3;

            if (!starboardChannelId) return;

            const starboardChannel = message.guild.channels.cache.get(starboardChannelId);
            if (!starboardChannel) return;

            let starboard = await Starboard.findOne({
                guildId: message.guild.id,
                originalMessageId: message.id
            });

            if (!starboard) {
                starboard = new Starboard({
                    guildId: message.guild.id,
                    originalMessageId: message.id,
                    originalChannelId: message.channel.id,
                    stars: [],
                    content: message.content || '',
                    authorId: message.author.id,
                    imageUrl: message.attachments.first()?.url
                });
            }

            if (added) {
                if (!starboard.stars.includes(user.id)) {
                    starboard.stars.push(user.id);
                }
            } else {
                starboard.stars = starboard.stars.filter(id => id !== user.id);
            }

            const starCount = starboard.stars.length;

            if (starCount >= threshold) {
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: message.author.tag,
                        iconURL: message.author.displayAvatarURL()
                    })
                    .setDescription(starboard.content || '*[No content]*')
                    .setColor('#FEE75C')
                    .addFields(
                        { name: 'المصدر', value: `[انتقل للرسالة](${message.url})`, inline: true },
                        { name: 'القناة', value: `<#${message.channel.id}>`, inline: true }
                    )
                    .setFooter({ text: `⭐ ${starCount}` })
                    .setTimestamp(message.createdAt);

                if (starboard.imageUrl) {
                    embed.setImage(starboard.imageUrl);
                }

                if (starboard.starboardMessageId) {
                    const starboardMessage = await starboardChannel.messages.fetch(
                        starboard.starboardMessageId
                    ).catch(() => null);

                    if (starboardMessage) {
                        await starboardMessage.edit({ embeds: [embed] });
                    } else {
                        const newMessage = await starboardChannel.send({ embeds: [embed] });
                        starboard.starboardMessageId = newMessage.id;
                    }
                } else {
                    const newMessage = await starboardChannel.send({ embeds: [embed] });
                    starboard.starboardMessageId = newMessage.id;
                }
            } else if (starboard.starboardMessageId && starCount < threshold) {
                const starboardMessage = await starboardChannel.messages.fetch(
                    starboard.starboardMessageId
                ).catch(() => null);

                if (starboardMessage) {
                    await starboardMessage.delete();
                    starboard.starboardMessageId = null;
                }
            }

            await starboard.save();

        } catch (error) {
            logger.error('Error handling star:', error);
        }
    }
}
