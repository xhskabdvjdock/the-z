import { StarboardManager } from '../systems/starboard/starboardManager.js';

export default {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    await StarboardManager.handleStar(reaction, user, true);
  },
};
