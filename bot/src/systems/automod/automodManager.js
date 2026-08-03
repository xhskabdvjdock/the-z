import Guild from '../../models/Guild.js';
import { createLog } from '../logging/logManager.js';
import logger from '../../utils/logger.js';
import Warning from '../../models/Warning.js';

export class AutoModManager {
  static messageCounts = new Map();
  static joinCounts = new Map();

  static async checkMessage(message, client) {
    if (message.author.bot) return false;

    try {
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      if (!guildData || !guildData.automod.enabled) return false;

      const automod = guildData.automod;
      let shouldPunish = false;
      let reason = '';

      // Anti Spam
      if (automod.antiSpam?.enabled) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        const timeWindow = automod.antiSpam.timeWindow * 1000;
        const maxMessages = automod.antiSpam.maxMessages;

        if (!this.messageCounts.has(key)) {
          this.messageCounts.set(key, []);
        }

        const messages = this.messageCounts.get(key);
        messages.push(now);
        
        // Remove old messages
        const recent = messages.filter(t => now - t < timeWindow);
        this.messageCounts.set(key, recent);

        if (recent.length >= maxMessages) {
          shouldPunish = true;
          reason = 'Spam detected';
          await message.delete().catch(() => {});
        }
      }

      // Anti Links
      if (automod.antiLinks?.enabled && !shouldPunish) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasLink = urlRegex.test(message.content);
        const isWhitelisted = automod.antiLinks.whitelist.some(domain => 
          message.content.includes(domain)
        );
        const isWhitelistedChannel = automod.antiLinks.channels.includes(message.channel.id);

        if (hasLink && !isWhitelisted && !isWhitelistedChannel) {
          shouldPunish = true;
          reason = 'Link detected';
          await message.delete().catch(() => {});
        }
      }

      // Anti Caps
      if (automod.antiCaps?.enabled && !shouldPunish) {
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const capsPercentage = (capsCount / message.content.length) * 100;

        if (message.content.length >= automod.antiCaps.minLength && 
            capsPercentage >= automod.antiCaps.maxPercentage) {
          shouldPunish = true;
          reason = 'Excessive caps';
          await message.delete().catch(() => {});
        }
      }

      // Bad Words
      if (automod.badWords?.enabled && !shouldPunish) {
        const hasBadWord = automod.badWords.words.some(word => 
          message.content.toLowerCase().includes(word.toLowerCase())
        );

        if (hasBadWord) {
          shouldPunish = true;
          reason = 'Bad word detected';
          await message.delete().catch(() => {});
        }
      }

      // Apply punishment
      if (shouldPunish) {
        await this.applyPunishment(message.member, automod.punishment, reason, client);
        await createLog(message.guild.id, 'moderation', 'automod', {
          userId: message.author.id,
          reason: reason,
          punishment: automod.punishment,
        }, client);
      }

      return shouldPunish;
    } catch (error) {
      logger.error('Error checking message:', error);
      return false;
    }
  }

  static async checkRaid(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id });
      if (!guildData || !guildData.automod.enabled) return false;

      const automod = guildData.automod;
      if (!automod.antiRaid?.enabled) return false;

      const key = member.guild.id;
      const now = Date.now();
      const timeWindow = automod.antiRaid.timeWindow * 1000;
      const maxJoins = automod.antiRaid.maxJoins;

      if (!this.joinCounts.has(key)) {
        this.joinCounts.set(key, []);
      }

      const joins = this.joinCounts.get(key);
      joins.push(now);

      // Remove old joins
      const recent = joins.filter(t => now - t < timeWindow);
      this.joinCounts.set(key, recent);

      if (recent.length >= maxJoins) {
        // Raid detected - ban the member
        await member.ban({ reason: 'Raid detected' }).catch(() => {});
        await createLog(member.guild.id, 'moderation', 'automod', {
          userId: member.id,
          reason: 'Raid detected',
          punishment: 'ban',
        }, client);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking raid:', error);
      return false;
    }
  }

  static async applyPunishment(member, punishment, reason, client) {
    try {
      switch (punishment) {
        case 'warn':
          const warning = new Warning({
            guildId: member.guild.id,
            userId: member.id,
            moderatorId: client.user.id,
            reason: `AutoMod: ${reason}`,
          });
          await warning.save();
          break;

        case 'mute':
          await member.timeout(60 * 60 * 1000, `AutoMod: ${reason}`);
          break;

        case 'kick':
          await member.kick(`AutoMod: ${reason}`).catch(() => {});
          break;

        case 'ban':
          await member.ban({ reason: `AutoMod: ${reason}` }).catch(() => {});
          break;
      }
    } catch (error) {
      logger.error('Error applying punishment:', error);
    }
  }
}
