import { WelcomeManager } from '../systems/welcome/welcomeManager.js';
import { AutoRoleManager } from '../systems/autoroles/autoRoleManager.js';
import { AutoModManager } from '../systems/automod/automodManager.js';

export default {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Check for raid
    await AutoModManager.checkRaid(member, client);

    // Send welcome message
    await WelcomeManager.sendWelcome(member, client);

    // Assign auto roles
    await AutoRoleManager.assignAutoRoles(member, client);
  },
};
