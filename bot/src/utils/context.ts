import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  GuildBasedChannel,
  GuildMember,
  Message,
  Role,
  User
} from "discord.js";
import { ExtendedClient } from "../client";
import { BotCommand, CommandContext } from "../types/command";

export function buildSlashContext(
  client: ExtendedClient,
  interaction: ChatInputCommandInteraction
): CommandContext {
  const guild = interaction.guild!;
  const member = interaction.member as GuildMember;

  return {
    client,
    guild,
    member,
    user: interaction.user,
    channel: interaction.channel!,
    isSlash: true,
    interaction,
    args: [],
    reply: async (options) => {
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(options as any) as any;
      }
      return interaction.reply(options as any) as any;
    },
    getString: (name) => interaction.options.getString(name),
    getInteger: (name) => interaction.options.getInteger(name),
    getBoolean: (name) => interaction.options.getBoolean(name),
    getUser: async (name) => interaction.options.getUser(name),
    getMember: async (name) => interaction.options.getMember(name) as GuildMember | null,
    getChannel: (name) => interaction.options.getChannel(name) as GuildBasedChannel | null,
    getRole: (name) => interaction.options.getRole(name) as Role | null
  };
}

/**
 * يبني سياق أمر موحّد من رسالة نصية (استخدام البادئة)، معتمداً على ترتيب
 * الخيارات المعرّفة في الأمر لاستخراج المستخدم/الروم/الرول/إلخ من الأرغيومنتس.
 */
export function buildPrefixContext(
  client: ExtendedClient,
  message: Message,
  args: string[],
  command: BotCommand
): CommandContext {
  const guild = message.guild!;
  const member = message.member!;
  const specs = command.options ?? [];

  const resolveAt = (name: string) => {
    const index = specs.findIndex((s) => s.name === name);
    return index === -1 ? undefined : args[index];
  };

  return {
    client,
    guild,
    member,
    user: message.author,
    channel: message.channel,
    isSlash: false,
    message,
    args,
    reply: async (options) => {
      return message.reply(options as any) as any;
    },
    getString: (name) => {
      const index = specs.findIndex((s) => s.name === name);
      if (index === -1) return null;
      return args.slice(index).join(" ") || null;
    },
    getInteger: (name) => {
      const raw = resolveAt(name);
      const num = raw ? parseInt(raw, 10) : NaN;
      return Number.isNaN(num) ? null : num;
    },
    getBoolean: (name) => {
      const raw = resolveAt(name);
      if (!raw) return null;
      return ["true", "yes", "نعم", "1"].includes(raw.toLowerCase());
    },
    getUser: async (name) => {
      const raw = resolveAt(name);
      if (!raw) return message.mentions.users.first() ?? null;
      const id = raw.replace(/[<@!>]/g, "");
      return (
        message.mentions.users.first() ??
        (await client.users.fetch(id).catch(() => null))
      );
    },
    getMember: async (name) => {
      const raw = resolveAt(name);
      if (!raw) return message.mentions.members?.first() ?? null;
      const id = raw.replace(/[<@!>]/g, "");
      return (
        message.mentions.members?.first() ??
        (await guild.members.fetch(id).catch(() => null))
      );
    },
    getChannel: (name) => {
      const raw = resolveAt(name);
      const fromMention = message.mentions.channels.first();
      if (fromMention) return fromMention as GuildBasedChannel;
      if (!raw) return null;
      const id = raw.replace(/[<#>]/g, "");
      return guild.channels.cache.get(id) ?? null;
    },
    getRole: (name) => {
      const raw = resolveAt(name);
      const fromMention = message.mentions.roles.first();
      if (fromMention) return fromMention;
      if (!raw) return null;
      const id = raw.replace(/[<@&>]/g, "");
      return guild.roles.cache.get(id) ?? guild.roles.cache.find((r) => r.name === raw) ?? null;
    }
  };
}
