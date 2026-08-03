import { LevelingManager } from '../systems/leveling/levelingManager.js';

export default {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check for guild messages only
    if (!message.guild) return;

    // Add XP
    await LevelingManager.addXP(message);
  },
};
