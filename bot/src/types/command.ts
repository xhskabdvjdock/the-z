import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  Message,
  PermissionResolvable,
  Role,
  TextBasedChannel,
  User
} from "discord.js";
import { ExtendedClient } from "../client";

export type CommandOptionType =
  | "user"
  | "string"
  | "integer"
  | "number"
  | "channel"
  | "role"
  | "boolean";

export interface CommandOptionSpec {
  name: string;
  description: string;
  type: CommandOptionType;
  required?: boolean;
  choices?: { name: string; value: string }[];
}

export interface CommandContext {
  client: ExtendedClient;
  guild: Guild;
  member: GuildMember;
  user: User;
  channel: TextBasedChannel;
  isSlash: boolean;
  interaction?: ChatInputCommandInteraction;
  message?: Message;
  args: string[];
  reply(options: BaseMessageOptions | string): Promise<Message | undefined>;
  getString(name: string): string | null;
  getInteger(name: string): number | null;
  getBoolean(name: string): boolean | null;
  getUser(name: string): Promise<User | null>;
  getMember(name: string): Promise<GuildMember | null>;
  getChannel(name: string): GuildBasedChannel | null;
  getRole(name: string): Role | null;
}

export interface BotCommand {
  name: string;
  description: string;
  category: string;
  options?: CommandOptionSpec[];
  defaultMemberPermissions?: PermissionResolvable;
  guildOnly?: boolean;
  cooldownSeconds?: number;
  run(ctx: CommandContext): Promise<void>;
}
