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

/** ذاكرة مؤقتة بسيطة لتقليل تكرار السجلات نفسها */
const logCache = new Map<string, number>();
const LOG_CACHE_TTL = 10000; // 10 ثواني

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
    console.error("خطأ أثناء إرسال سجل:", err);
  }
}
