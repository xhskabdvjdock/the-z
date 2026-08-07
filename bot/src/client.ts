import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { BotCommand } from "./types/command";

export class ExtendedClient extends Client {
  commands: Collection<string, BotCommand> = new Collection();
  cooldowns: Collection<string, Collection<string, number>> = new Collection();
  /** كاش بسيط لإعدادات كل سيرفر لتقليل قراءات قاعدة البيانات */
  guildConfigCache: Collection<string, { data: any; expiresAt: number }> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,        // Privileged — enable in Dev Portal
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,      // Privileged — enable in Dev Portal
        GatewayIntentBits.GuildVoiceStates,
        // GatewayIntentBits.GuildPresences   // Privileged — removed to prevent connection hang
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
    });
  }
}
