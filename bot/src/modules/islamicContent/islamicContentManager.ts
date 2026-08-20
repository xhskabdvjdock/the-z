import { GuildConfig, IIslamicContent } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { getGuildConfig, invalidateGuildConfigCache } from "../../utils/guildConfig";
import { logError, logInfo } from "../../utils/logger";
import { postIslamicContent, pruneRecent } from "./contentService";

/**
 * سجل المجدولات: جدول واحد كحد أقصى لكل سيرفر.
 * أي تعديل على الإعدادات (فترة، قناة، تشغيل/إيقاف) يوقف الجدول القديم وينشئ جدولًا جديدًا
 * حتى لا يتضاعف النشر.
 */
const schedulers = new Map<string, NodeJS.Timeout>();

/** حساب موعد النشر التالي: الآن + الفترة بالدقائق (حد أدنى دقيقة واحدة) */
export function computeNextRunAt(intervalMinutes: number, now = Date.now()): string {
  const minutes = Number(intervalMinutes);
  const safe = Number.isFinite(minutes) ? Math.max(1, Math.floor(minutes)) : 60;
  return new Date(now + safe * 60_000).toISOString();
}

/** إيقاف جدول سيرفر (إن وجد) */
export function stopIslamicScheduler(guildId: string): void {
  const timer = schedulers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    schedulers.delete(guildId);
  }
}

/** هل يوجد جدول نشط لهذا السيرفر؟ */
export function isIslamicSchedulerActive(guildId: string): boolean {
  return schedulers.has(guildId);
}

/** عدد السيرفرات المجدولة حالياً (لأغراض المراقبة) */
export function schedulerCount(): number {
  return schedulers.size;
}

/**
 * إنشاء جدول النشر لسيرفر — يوقف أي جدول سابق أولاً (جدول واحد فقط لكل سيرفر).
 * إذا كان النظام معطلًا أو لا توجد قناة، لا يُنشأ جدول.
 */
export function ensureScheduler(
  client: ExtendedClient,
  guildId: string,
  config: IIslamicContent
): void {
  stopIslamicScheduler(guildId);
  if (!config.enabled || !config.channelId) return;

  const nextAt = config.nextRunAt ? new Date(config.nextRunAt).getTime() : Date.now();
  const delayMs = Math.max(1_000, nextAt - Date.now());

  const timer = setTimeout(() => {
    runForGuild(client, guildId).catch((err) => logError("islamic/run", err));
  }, delayMs);
  schedulers.set(guildId, timer);
}

/**
 * إعادة جدولة من إعدادات القاعدة الحالية (تُستخدم بعد أي تغيير أو عند إعادة التشغيل).
 * قراءة مباشرة بدون كاش للتأكد من آخر حالة محفوظة.
 */
export async function restartIslamicScheduler(
  client: ExtendedClient,
  guildId: string
): Promise<void> {
  const fresh = await GuildConfig.findOne({ guildId }).lean();
  ensureScheduler(client, guildId, fresh?.islamicContent ?? ({} as IIslamicContent));
}

/** دورة النشر: قراءة إعدادات حديثة، نشر، حفظ الحالة، ثم جدولة الدورة التالية */
async function runForGuild(client: ExtendedClient, guildId: string): Promise<void> {
  try {
    const gConfig = await getGuildConfig(client, guildId);
    const config = gConfig.islamicContent;

    if (!config.enabled || !config.channelId) {
      stopIslamicScheduler(guildId);
      return;
    }

    const result = await postIslamicContent(client, config);

    if (result.ok) {
      config.recentlySent = pruneRecent(
        [...(config.recentlySent ?? []), { id: result.item.id, at: new Date().toISOString() }],
        config.antiRepeatMinutes * 60_000
      );
      config.lastPosted = {
        id: result.item.id,
        type: result.item.type,
        at: new Date().toISOString()
      };
      config.nextRunAt = computeNextRunAt(config.intervalMinutes);
      await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { islamicContent: config } }
      );
      invalidateGuildConfigCache(client, guildId);
    } else {
      // لا نوقف الجدولة عند الفشل — نعيد المحاولة في الدورة التالية
      config.nextRunAt = computeNextRunAt(config.intervalMinutes);
      await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { islamicContent: config } }
      );
      invalidateGuildConfigCache(client, guildId);
    }
  } catch (err) {
    logError("islamic/run", err);
  } finally {
    await restartIslamicScheduler(client, guildId).catch((err) =>
      logError("islamic/restart", err)
    );
  }
}

/** تشغيل المجدولات عند جاهزية البوت: يجدول لكل سيرفر مفعّل وله قناة */
export async function startIslamicContent(client: ExtendedClient): Promise<void> {
  const guildIds = [...client.guilds.cache.keys()];
  logInfo("islamic", `بدء المجدولات لـ ${guildIds.length} سيرفر`);
  for (const guildId of guildIds) {
    try {
      const gConfig = await getGuildConfig(client, guildId);
      ensureScheduler(client, guildId, gConfig.islamicContent);
    } catch (err) {
      logError(`islamic/start/${guildId}`, err);
    }
  }
}