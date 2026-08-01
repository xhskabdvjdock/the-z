import { VoiceState } from "discord.js";
import { BotEvent } from "../types/event";
import { getGuildConfig } from "../utils/guildConfig";
import { handleVoiceStateUpdate as handleTempVoice } from "../modules/tempVoice/voiceManager";

const event: BotEvent = {
  name: "voiceStateUpdate",
  async execute(client, oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild ?? oldState.guild;
    const gConfig = await getGuildConfig(client, guild.id);

    if (gConfig.tempVoice?.enabled) {
      await handleTempVoice(client, oldState, newState, gConfig).catch((err: unknown) =>
        console.error("خطأ في نظام الرومات الصوتية المؤقتة:", err)
      );
    }
  }
};

export default event;
