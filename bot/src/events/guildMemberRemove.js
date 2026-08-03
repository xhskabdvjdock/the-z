import { WelcomeManager } from '../systems/welcome/welcomeManager.js';

export default {
  name: 'guildMemberRemove',
  async execute(member, client) {
    // Send leave message
    await WelcomeManager.sendLeave(member, client);
  },
};
