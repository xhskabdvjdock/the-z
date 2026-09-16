import { AfkUser } from "@thez/shared";
import { logError } from "./logger";
import { recordDbWrite } from "./metrics";

/**
 * مجمّع عدّادات AFK — المنشنات تتراكم في الذاكرة وتُحفَظ دفعة واحدة
 * كل 30 ثانية عبر المجدول المركزي، بدل N×updateOne مع كل رسالة.
 */

/** حد أعلى للإدخالات المعلقة */
const MAX_PENDING = 5000;

const pendingMentions = new Map<string, number>();

const keyOf = (guildId: string, userId: string) => `${guildId}:${userId}`;

/** تسجيل منشن لمستخدم AFK — بلا أي DB، يُحفَظ لاحقًا */
export function recordAfkMention(guildId: string, userId: string): void {
  const key = keyOf(guildId, userId);
  pendingMentions.set(key, (pendingMentions.get(key) ?? 0) + 1);
  if (pendingMentions.size > MAX_PENDING) {
    // إسقاط الأقدم عند الامتلاء (نادر — يحمي الذاكرة)
    const oldest = pendingMentions.keys().next().value;
    if (oldest !== undefined) pendingMentions.delete(oldest);
  }
}

/** تفريغ المتراكم — تحديث واحد لكل مستخدم بدل تحديث لكل منشن */
export async function flushAfkMentions(): Promise<void> {
  if (pendingMentions.size === 0) return;
  const batch = [...pendingMentions.entries()];
  pendingMentions.clear();
  for (const [key, count] of batch) {
    const sep = key.indexOf(":");
    const guildId = key.slice(0, sep);
    const userId = key.slice(sep + 1);
    try {
      recordDbWrite();
      await AfkUser.updateOne({ guildId, userId }, { $inc: { mentionCount: count } });
    } catch (err) {
      logError("afk-flush", err);
    }
  }
}

/** للاختبار والمراقبة */
export function pendingAfkCount(): number {
  return pendingMentions.size;
}

export function clearAfkState(): void {
  pendingMentions.clear();
}
