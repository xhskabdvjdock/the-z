import { BaseMessageOptions, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { config as botConfig } from "../../config";

export type LogChannelKey =
  | "moderation"
  | "members"
  | "messages"
  | "voice"
  | "actions"
  | "files"
  | "server"
  | "roles"
  | "channels"
  | "other"
  | "invites"
  | string;

/** يرسل تضمين (Embed) جاهز لروم اللوق المخصص لهذا النوع من الأحداث */
export async function sendLog(
  client: ExtendedClient,
  guildId: string,
  key: LogChannelKey,
  embed: EmbedBuilder,
  extra?: BaseMessageOptions
) {
  try {
    const gConfig = await getGuildConfig(client, guildId);
    if (!gConfig.logging?.enabled) return;
    const channelId = (gConfig.logging.channels as any)?.[key];
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    if (!embed.data.color) embed.setColor(botConfig.defaultColor);
    if (!embed.data.timestamp) embed.setTimestamp();

    await (channel as any).send({ embeds: [embed], ...extra });
  } catch (err) {
    console.error("خطأ أثناء إرسال سجل:", err);
  }
}
