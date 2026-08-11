import { BaseMessageOptions, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { config as botConfig } from "../../config";
import { logError } from "../../utils/logger";

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
    logError("send-log", err);
  }
}

export interface LogAttachmentRef {
  url: string;
  name: string;
  contentType?: string | null;
  size?: number;
}

const MAX_LOG_ATTACHMENTS = 3;
const MAX_LOG_FILE_BYTES = 8 * 1024 * 1024;

/**
 * يرسل سجل وسائط (صور/ملفات): يرفق الملفات نفسها برسالة اللوق (حتى لو حُذفت
 * الرسالة الأصلية — روابط CDN تبقى صالحة) ويعرض أول صورة داخل الـ embed.
 * الملفات الأكبر من 8MB تُتجاهل وعدد المرفقات محدود بـ 3 لتفادي فشل الإرسال.
 */
export async function sendMediaLog(
  client: ExtendedClient,
  guildId: string,
  key: LogChannelKey,
  embed: EmbedBuilder,
  attachments: LogAttachmentRef[],
  limit = MAX_LOG_ATTACHMENTS
) {
  const usable = attachments
    .filter((a) => !a.size || a.size <= MAX_LOG_FILE_BYTES)
    .slice(0, limit);

  if (!usable.length) {
    await sendLog(client, guildId, key, embed);
    return;
  }

  const files = usable.map((a) => ({ attachment: a.url, name: a.name }));
  const firstImage = usable.find((a) => a.contentType?.startsWith("image/"));
  if (firstImage && !embed.data.image) {
    embed.setImage(`attachment://${firstImage.name}`);
  }

  await sendLog(client, guildId, key, embed, { files });
}
