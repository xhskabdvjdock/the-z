import { AnalyticsBucket } from "@thez/shared";
import { logError } from "../../utils/logger";
import { recordAnalyticsEvent, recordAnalyticsFlushed, recordDbRead, recordDbWrite } from "../../utils/metrics";
import { registerFlushHandler, registerRecurring } from "../../scheduler/scheduler";

/**
 * تحليلات مجمعة: عدّادات ذاكرة لكل سيرفر تُفرَّغ مرة كل دقيقة
 * إلى حاويات (ساعة/يوم) — لا كتابة لكل رسالة أو حدث.
 */

export const ANALYTICS_FLUSH_MS = 60_000;
/** الاحتفاظ: ساعة 7 أيام، يوم 90 يومًا */
export const RETENTION_HOURS_DAYS = 7;
export const RETENTION_DAYS_DAYS = 90;
/** حدود الذاكرة لكل سيرفر */
const MAX_USERS_PER_GUILD = 2000;
const MAX_COMMAND_KEYS = 100;
const MAX_MOD_KEYS = 20;
const MAX_VOICE_SESSIONS = 5000;
const TOP_USERS = 25;
const TOP_CHANNELS = 15;

interface GuildCounters {
  metrics: Map<string, number>;
  users: Map<string, number>;
  channels: Map<string, number>;
  voiceSessions: Map<string, number>;
  lastCleanupHour: string;
}

const counters = new Map<string, GuildCounters>();

function getGuild(guildId: string): GuildCounters {
  let g = counters.get(guildId);
  if (!g) {
    g = {
      metrics: new Map(),
      users: new Map(),
      channels: new Map(),
      voiceSessions: new Map(),
      lastCleanupHour: ""
    };
    counters.set(guildId, g);
  }
  return g;
}

function inc(guildId: string, metric: string, n = 1): void {
  const g = getGuild(guildId);
  g.metrics.set(metric, (g.metrics.get(metric) ?? 0) + n);
  recordAnalyticsEvent();
}

function hourKey(d = new Date()): string {
  return d.toISOString().slice(0, 13); // "2026-09-16T14" UTC
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // "2026-09-16" UTC
}

/** رسالة مرسلة — تُستدعى من messageCreate (ذاكرة فقط) */
export function trackMessage(guildId: string, userId: string, channelId: string): void {
  const g = getGuild(guildId);
  inc(guildId, "messages");
  if (g.users.size < MAX_USERS_PER_GUILD) {
    g.users.set(userId, (g.users.get(userId) ?? 0) + 1);
  }
  g.channels.set(channelId, (g.channels.get(channelId) ?? 0) + 1);
}

/** أمر منفذ — بالاسم (مقتطع لأشهر 100) */
export function trackCommand(guildId: string, name: string): void {
  const g = getGuild(guildId);
  inc(guildId, "commands");
  const key = `command_${name}`.slice(0, 64);
  const commandKeys = [...g.metrics.keys()].filter((k) => k.startsWith("command_"));
  if (g.metrics.has(key) || commandKeys.length < MAX_COMMAND_KEYS) {
    g.metrics.set(key, (g.metrics.get(key) ?? 0) + 1);
  }
}

/** انضمام/مغادرة صوتية — الدقائق تُحسب عند المغادرة */
export function trackVoiceJoin(guildId: string, userId: string): void {
  const g = getGuild(guildId);
  if (g.voiceSessions.size >= MAX_VOICE_SESSIONS) return;
  g.voiceSessions.set(userId, Date.now());
  inc(guildId, "voiceSessions");
}

export function trackVoiceLeave(guildId: string, userId: string): void {
  const g = getGuild(guildId);
  const joinedAt = g.voiceSessions.get(userId);
  g.voiceSessions.delete(userId);
  if (!joinedAt) return;
  const minutes = Math.floor((Date.now() - joinedAt) / 60_000);
  if (minutes > 0) inc(guildId, "voiceMinutes", minutes);
}

/** انضمام/مغادرة عضو */
export function trackJoin(guildId: string): void {
  inc(guildId, "joins");
}

export function trackLeave(guildId: string): void {
  inc(guildId, "leaves");
}

/** إجراء إشرافي — عبر recordModerationLog حصرًا (مقتطع لأشهر 20 إجراء) */
export function trackModeration(guildId: string, action: string): void {
  const g = getGuild(guildId);
  inc(guildId, "moderation");
  const key = `moderation_${action}`.slice(0, 64);
  const modKeys = [...g.metrics.keys()].filter((k) => k.startsWith("moderation_"));
  if (g.metrics.has(key) || modKeys.length < MAX_MOD_KEYS) {
    g.metrics.set(key, (g.metrics.get(key) ?? 0) + 1);
  }
}

/** خبرة مكتسبة وترقيات — تُستدعى من تفريغ XP مرة واحدة لكل سيرفر */
export function trackXp(guildId: string, xp: number, levelups: number): void {
  if (xp > 0) inc(guildId, "xp", xp);
  if (levelups > 0) inc(guildId, "levelups", levelups);
}

function topEntries(map: Map<string, number>, limit: number): Array<{ id: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

/** تفريغ سيرفر واحد: حاوية ساعة (مع tops) + حاوية يوم (قياسيات فقط) */
async function flushGuild(guildId: string, g: GuildCounters): Promise<void> {
  if (g.metrics.size === 0) return;
  const now = new Date();
  const hk = hourKey(now);
  const dk = dayKey(now);
  // لقطة ثم مسح فوري — at-most-once مثل XP في Phase 0 (الفشل يُسقط دقيقة واحدة نادرًا بدل التكرار)
  const metricsObj = Object.fromEntries(g.metrics);
  const tops = { users: topEntries(g.users, TOP_USERS), channels: topEntries(g.channels, TOP_CHANNELS) };
  g.metrics.clear();
  g.users.clear();
  g.channels.clear();

  try {
    // حاوية الساعة: قراءة للدمج ثم كتابة واحدة
    recordDbRead();
    const existing = await AnalyticsBucket.findOne({ key: `${guildId}:hour:${hk}` });
    if (existing) {
      const merged = { ...(existing.metrics ?? {}) };
      for (const [k, v] of Object.entries(metricsObj)) merged[k] = (merged[k] ?? 0) + v;
      recordDbWrite();
      await AnalyticsBucket.findOneAndUpdate(
        { key: `${guildId}:hour:${hk}` },
        {
          $set: {
            metrics: merged,
            topUsers: tops.users,
            topChannels: tops.channels,
            updatedAt: new Date()
          }
        }
      );
    } else {
      recordDbWrite();
      await AnalyticsBucket.findOneAndUpdate(
        { key: `${guildId}:hour:${hk}` },
        {
          $set: {
            guildId,
            bucket: "hour",
            bucketKey: hk,
            metrics: metricsObj,
            topUsers: tops.users,
            topChannels: tops.channels,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    // حاوية اليوم: قياسيات فقط، upsert مباشر بلا قراءة
    recordDbWrite();
    const incOps: Record<string, number> = {};
    for (const [k, v] of Object.entries(metricsObj)) incOps[`metrics.${k}`] = v;
    await AnalyticsBucket.findOneAndUpdate(
      { key: `${guildId}:day:${dk}` },
      {
        $set: { guildId, bucket: "day", bucketKey: dk, updatedAt: new Date() },
        $inc: incOps
      },
      { upsert: true }
    );

    recordAnalyticsFlushed();
  } catch (err) {
    logError("analytics-flush", err);
    return;
  }

  // تنظيف Retention مرة كل ساعة لكل سيرفر (مفاتيح محسوبة مباشرة — بلا مسح)
  if (g.lastCleanupHour !== hk) {
    g.lastCleanupHour = hk;
    await cleanupGuild(guildId, now).catch((err) => logError("analytics-cleanup", err));
  }
}

/** حذف مفاتيح منتهية محسوبة مباشرة: ساعات يوم (اليوم-8) + أيام أقدم من 90 */
async function cleanupGuild(guildId: string, now: Date): Promise<void> {
  const DAY_MS = 24 * 60 * 60_000;
  const oldDay = new Date(now.getTime() - (RETENTION_HOURS_DAYS + 1) * DAY_MS);
  for (let h = 0; h < 24; h++) {
    const hk = oldDay.toISOString().slice(0, 10) + "T" + String(h).padStart(2, "0");
    await AnalyticsBucket.deleteOne({ key: `${guildId}:hour:${hk}` }).catch(() => null);
  }
  for (let d = RETENTION_DAYS_DAYS + 1; d <= RETENTION_DAYS_DAYS + 7; d++) {
    const dk = new Date(now.getTime() - d * DAY_MS).toISOString().slice(0, 10);
    await AnalyticsBucket.deleteOne({ key: `${guildId}:day:${dk}` }).catch(() => null);
  }
  // جلسات صوتية عالقة (>12 ساعة) تُحذف
  const cutoff = Date.now() - 12 * 60 * 60_000;
  const g = counters.get(guildId);
  if (g) {
    for (const [userId, ts] of g.voiceSessions) {
      if (ts < cutoff) g.voiceSessions.delete(userId);
    }
  }
}

/** تفريغ كل السيرفرات النشطة — يُستدعى من المجدول المركزي */
export async function flushAnalytics(): Promise<void> {
  if (counters.size === 0) return;
  for (const [guildId, g] of counters) {
    await flushGuild(guildId, g).catch((err) => logError("analytics-flush", err));
  }
}

export function registerAnalyticsScheduler(): void {
  registerRecurring("analytics-flush", ANALYTICS_FLUSH_MS, async () => {
    await flushAnalytics();
  });
  registerFlushHandler("analytics", () => flushAnalytics());
}

/** للاختبار — تنظيف Retention لسيرفر */
export async function cleanupGuildForTests(guildId: string, now: Date): Promise<void> {
  await cleanupGuild(guildId, now);
}

/** للاختبار والمراقبة */
export function getPendingAnalyticsGuilds(): number {
  let n = 0;
  for (const g of counters.values()) if (g.metrics.size > 0) n++;
  return n;
}

export function clearAnalyticsState(): void {
  counters.clear();
}
