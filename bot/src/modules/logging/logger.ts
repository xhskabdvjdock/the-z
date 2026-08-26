import { BaseMessageOptions, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { config as botConfig } from "../../config";
import { logError } from "../../utils/logger";
import { LogEntry } from "@thez/shared";

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
  | "gifblock"
  | "suggestions"
  | "access"
  | "leveling"
  | "jail"
  | "reactionroles"
  | string;

/** ذاكرة مؤقتة بسيطة لتقليل تكرار السجلات نفسها */
const logCache = new Map<string, number>();
const LOG_CACHE_TTL = 10000; // 10 ثواني

/** يرسل تضمين (Embed) محسّن مع معلومات كاملة */
export async function sendLog(
  client: ExtendedClient,
  guildId: string,
  key: LogChannelKey,
  embed: EmbedBuilder,
  extra?: BaseMessageOptions,
  options?: {
    // من قام بالإجراء
    executorId?: string;
    executorTag?: string;
    // من تأثر بالإجراء
    targetId?: string;
    targetTag?: string;
    // تفاصيل الإجراء
    reason?: string;
    duration?: string;
    channelId?: string;
    channelName?: string;
    roleId?: string;
    roleName?: string;
    messageId?: string;
    messageUrl?: string;
    // حالة قبل وبعد
    before?: any;
    after?: any;
    // تفاصيل إضافية
    details?: any;
  }
) {
  try {
    const gConfig = await getGuildConfig(client, guildId);
    if (!gConfig.logging?.enabled) return;
    const channelId = (gConfig.logging.channels as any)?.[key];
    if (!channelId) return;

    // إنشاء مفتاح للكاش لتجنب تكرار السجلات المتشابهة
    const logKey = `${guildId}:${key}:${JSON.stringify(embed.data)}`;
    const now = Date.now();
    const lastLog = logCache.get(logKey);

    // تجاهل السجلات المتكررة خلال 10 ثواني
    if (lastLog && (now - lastLog) < LOG_CACHE_TTL) {
      return;
    }

    logCache.set(logKey, now);

    // تنظيف الكاش القديم
    for (const [k, time] of logCache.entries()) {
      if (now - time > LOG_CACHE_TTL) {
        logCache.delete(k);
      }
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    if (!embed.data.color) embed.setColor(botConfig.defaultColor);
    if (!embed.data.timestamp) embed.setTimestamp();

    // حفظ السجل في قاعدة البيانات مع تفاصيل كاملة
    if (options) {
      await LogEntry.create({
        guildId,
        type: key as any,
        action: embed.data.title || "Unknown",
        executorId: options.executorId,
        executorTag: options.executorTag,
        targetId: options.targetId,
        targetTag: options.targetTag,
        reason: options.reason,
        duration: options.duration,
        channelId: options.channelId,
        channelName: options.channelName,
        roleId: options.roleId,
        roleName: options.roleName,
        messageId: options.messageId,
        messageUrl: options.messageUrl,
        before: options.before,
        after: options.after,
        details: options.details,
        createdAt: new Date()
      }).catch(() => {});
    }

    // استخدام retry للتعامل مع rate limits
    await client.withRetry(async () => {
      await (channel as any).send({ embeds: [embed], ...extra });
    }, 2, 500).catch((err) => {
      console.warn('[Log] Failed to send log after retries:', err.message);
    });
  } catch (err: any) {
    // التعامل مع rate limits بشكل خاص
    if (err.code === 50001 || err.message?.includes('Rate limit')) {
      console.warn('[Log] Rate limit hit, logging suppressed temporarily');
      return;
    }
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
