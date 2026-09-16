import { Channel, Guild, GuildMember, Message, User } from "discord.js";
import { IGuildConfig } from "@thez/shared";
import { ExtendedClient } from "../client";

/**
 * سياق معالجة رسالة خفيف ومشترك — يُبنى مرة واحدة في messageCreate
 * وتمرَّر نفس النسخة لكل الأنظمة بدل أن يعيد كل نظام جلب الإعدادات.
 */
export interface MessageProcessingContext {
  client: ExtendedClient;
  guild: Guild;
  guildId: string;
  member: GuildMember | null;
  user: User;
  channel: Channel;
  channelId: string;
  message: Message;
  /** نفس كائن الإعدادات المكشّن — يُمرَّر بالمرجع ولا يُعاد جلبه */
  guildConfig: IGuildConfig;
  timestamp: number;
}

export function buildMessageContext(
  client: ExtendedClient,
  message: Message,
  guildConfig: IGuildConfig
): MessageProcessingContext | null {
  if (!message.guild) return null;
  return {
    client,
    guild: message.guild,
    guildId: message.guild.id,
    member: message.member,
    user: message.author,
    channel: message.channel,
    channelId: message.channelId,
    message,
    guildConfig,
    timestamp: Date.now()
  };
}
