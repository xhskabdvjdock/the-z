import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { createCooldownStore, CooldownStore } from "@thez/shared";
import { BotCommand } from "./types/command";

export class ExtendedClient extends Client {
  commands: Collection<string, BotCommand> = new Collection();

  /**
   * مخزن البرودة الموحّد. التنفيذ Hybrid: كتابة محلية فورية + تمرير إلى Redis
   * عند التوفر (TTL إجباري) — الواجهة CooldownStore لم تتغير، لذا لا يعرف أي أمر
   * أنه تعامل مع Redis. عند غياب Redis: يبقى محليًا آمنًا مع تحذير واحد.
   */
  commandCooldowns: CooldownStore = createCooldownStore();

  /** كاش بسيط لإعدادات كل سيرفر لتقليل قراءات قاعدة البيانات */
  guildConfigCache: Collection<string, { data: any; expiresAt: number }> = new Collection();

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
  }
}