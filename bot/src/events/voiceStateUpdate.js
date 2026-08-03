import { AutoVoiceManager } from '../systems/autovoice/autoVoiceManager.js';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    await AutoVoiceManager.handleVoiceStateUpdate(oldState, newState, client);
  },
};
