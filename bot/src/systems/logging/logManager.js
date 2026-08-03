import Log from '../../models/Log.js';
import Guild from '../../models/Guild.js';
import { EmbedBuilder, Colors } from 'discord.js';
import logger from '../../utils/logger.js';

export const createLog = async (guildId, type, action, details, client) => {
  try {
    // Save to database
    const log = new Log({
      guildId,
      type,
      action,
      userId: details.userId,
      moderatorId: details.moderatorId,
      details,
    });
    await log.save();

    // Send to log channel
    const guildData = await Guild.findOne({ guildId });
    if (!guildData || !guildData.logs.enabled) return;

    const channelId = guildData.logs.channels[type] || guildData.logs.channels.moderation;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`📝 ${getActionName(action)}`)
      .setColor(getActionColor(type))
      .setTimestamp()
      .setFooter({ text: `ID: ${details.userId || 'N/A'}` });

    // Add details based on type
    if (details.userId) {
      try {
        const user = await client.users.fetch(details.userId);
        embed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
      } catch (error) {
        embed.setAuthor({ name: `User ${details.userId}` });
      }
    }

    if (details.moderatorId) {
      try {
        const moderator = await client.users.fetch(details.moderatorId);
        embed.addFields({ name: 'المشرف', value: `${moderator.tag}`, inline: true });
      } catch (error) {
        embed.addFields({ name: 'المشرف', value: `ID: ${details.moderatorId}`, inline: true });
      }
    }

    if (details.reason) {
      embed.addFields({ name: 'السبب', value: details.reason, inline: false });
    }

    if (details.channelId) {
      embed.addFields({ name: 'القناة', value: `<#${details.channelId}>`, inline: true });
    }

    // Add other details
    Object.entries(details).forEach(([key, value]) => {
      if (!['userId', 'moderatorId', 'reason', 'channelId'].includes(key) && value) {
        embed.addFields({ name: key, value: String(value), inline: true });
      }
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('Error creating log:', error);
  }
};

const getActionName = (action) => {
  const names = {
    ban: 'حظر',
    kick: 'طرد',
    timeout: 'ميوت',
    warn: 'تحذير',
    purge: 'حذف رسائل',
    lock: 'قفل قناة',
    unlock: 'فتح قناة',
    created: 'إنشاء',
    closed: 'إغلاق',
    reopened: 'إعادة فتح',
    deleted: 'حذف',
  };
  return names[action] || action;
};

const getActionColor = (type) => {
  const colors = {
    moderation: Colors.Red,
    ticket: Colors.Blue,
    message: Colors.Green,
    voice: Colors.Purple,
    role: Colors.Orange,
    giveaway: Colors.Gold,
  };
  return colors[type] || Colors.Default;
};
