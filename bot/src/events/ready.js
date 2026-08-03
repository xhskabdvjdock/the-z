import logger from '../utils/logger.js';
import { AutoLineManager } from '../systems/autolines/autoLineManager.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}!`);
    logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
    logger.info(`Bot is watching ${client.users.cache.size} users`);
    
    // Set bot activity
    client.user.setActivity('Discord Bot | /help', { type: 'WATCHING' });

    // Start auto lines for all guilds
    for (const guild of client.guilds.cache.values()) {
      await AutoLineManager.startAutoLines(guild.id, client);
    }
  },
};
