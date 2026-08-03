import Guild from '../../models/Guild.js';
import { EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export class AutoLineManager {
  static intervals = new Map();

  static async startAutoLines(guildId, client) {
    try {
      const guildData = await Guild.findOne({ guildId });
      if (!guildData || !guildData.autolines.enabled) return;

      // Clear existing interval
      if (this.intervals.has(guildId)) {
        clearInterval(this.intervals.get(guildId));
      }

      // Start interval for each auto line
      guildData.autolines.lines.forEach((line, index) => {
        const interval = setInterval(async () => {
          try {
            const channel = client.channels.cache.get(line.channelId);
            if (!channel) return;

            const now = Date.now();
            const lastSent = line.lastSent ? new Date(line.lastSent).getTime() : 0;
            const intervalMs = line.interval * 60 * 1000; // Convert minutes to ms

            if (now - lastSent >= intervalMs) {
              if (line.embed) {
                const embed = new EmbedBuilder(line.embed);
                await channel.send({ embeds: [embed] });
              } else if (line.message) {
                await channel.send(line.message);
              }

              // Update lastSent
              line.lastSent = new Date();
              guildData.autolines.lines[index].lastSent = line.lastSent;
              await guildData.save();
            }
          } catch (error) {
            logger.error(`Error sending auto line in ${guildId}:`, error);
          }
        }, 60000); // Check every minute

        this.intervals.set(`${guildId}_${index}`, interval);
      });
    } catch (error) {
      logger.error('Error starting auto lines:', error);
    }
  }

  static stopAutoLines(guildId) {
    const keys = Array.from(this.intervals.keys()).filter(key => key.startsWith(guildId));
    keys.forEach(key => {
      clearInterval(this.intervals.get(key));
      this.intervals.delete(key);
    });
  }
}
