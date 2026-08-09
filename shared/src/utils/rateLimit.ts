/**
 * تحديد معدل الطلبات (Rate Limiting) للواجهات — تنفيذ في الذاكرة بواجهة قابلة للاستبدال
 * بـ Redis لاحقًا (مثل CooldownStore) دون تغيير مواقع الاستدعاء.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** العدد الفعلي للمللي ثانية حتى إعادة المحاولة */
  retryAfterMs: number;
}

export interface RateLimiterConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, { resetAt: number; count: number }>();

  /** حد أعلى للعدّاد قبل التنظيف — يمنع تضخّم الذاكرة بمفاتيح صناعية (مثل guildId وهمي) */
  private static readonly MAX_KEYS = 4096;

  constructor(private readonly config: RateLimiterConfig) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const current = this.store.get(key);
    if (!current || now >= current.resetAt) {
      if (this.store.size >= MemoryRateLimiter.MAX_KEYS) this.prune(now);
      this.store.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (current.count < this.config.limit) {
      current.count++;
      return { allowed: true, retryAfterMs: 0 };
    }
    return { allowed: false, retryAfterMs: current.resetAt - now };
  }

  /** يزيل النوافذ المنتهية فقط — منفصلة حتى لا تُحتسب في limit المفعّل */
  private prune(now: number): void {
    for (const [key, value] of this.store) {
      if (now >= value.resetAt) this.store.delete(key);
    }
  }

  /** عدد المفاتيح النشطة (للاختبار والمراقبة) */
  get size(): number {
    return this.store.size;
  }
}

export const apiRateLimiter: RateLimiter = new MemoryRateLimiter({
  limit: 120,
  windowMs: 60_000
});