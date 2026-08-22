import { Client, Collection, GatewayIntentBits, Partials, REST } from "discord.js";
import { BotCommand } from "./types/command";

export class ExtendedClient extends Client {
  commands: Collection<string, BotCommand> = new Collection();
  cooldowns: Collection<string, Collection<string, number>> = new Collection();
  /** كاش بسيط لإعدادات كل سيرفر لتقليل قراءات قاعدة البيانات */
  guildConfigCache: Collection<string, { data: any; expiresAt: number }> = new Collection();
  /** نظام إعادة المحاولة مع exponential backoff للتعامل مع rate limits */
  rest: REST;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
    });

    this.rest = new REST({ version: '10' }).setAgent(this.options.ws?.agent);

    // إضافة error handler للـ REST
    this.rest.on('restDebug', (info) => {
      if (info.includes('Rate limit')) {
        console.warn('[REST] Rate limit detected:', info);
      }
    });
  }

  /**
   * إعادة محاولة العمليات مع exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // إذا كان error rate limit، ننتظر ونحاول مرة أخرى
        if (error.code === 50001 || error.message?.includes('Rate limit')) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`[Retry] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
