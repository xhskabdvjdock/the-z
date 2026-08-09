/**
 * RedisRateLimiterAsync — تحديد معدل عبر Redis مع عدّادات ذرّية (INCR/EXPIRE atomic).
 * يفصل بين الواجهة والتنفيذ: RateLimiter (الواجهة الحالية sync) وواجهة async جديدة
 * تستخدمها الأنظمة عالية التردد. لا يُستخدم GET→SET يدوي أبدًا.
 */

import { RedisBackend, NS, TtlMs } from "./backend";
import { RateLimiter, MemoryRateLimiter, RateLimiterConfig, RateLimitResult } from "../utils/rateLimit";

/** الواجهة غير المتزامنة للأنظمة المستقبلية (AntiSpam/Raid...) */
export interface RateLimiterAsync {
  check(key: string, now?: number): Promise<RateLimitResult>;
}

/**
 * TTL = النافذة + هامش 1ث — المفتاح ينتهي فور انقضاء النافذة (تحديث العدّاد كامل)
 */
function ttlForWindow(windowMs: number): TtlMs {
  return Math.max(windowMs + 1_000, 1_000);
}

/**
 * تقع عدادات السقف في Redis:
 * INCR ثم EXPIRE في معاملة واحدة — متزامن لكل الأحداث ما لم يكن Redis،
 * وبالتالي لا يوجد GET→set علمي بينها.
 */
export class RedisRateLimiter implements RateLimiterAsync {
  constructor(
    private readonly backend: RedisBackend,
    private readonly config: RateLimiterConfig
  ) {}

  private key(key: string): string {
    return `${NS.ratelimit}:${key}`;
  }

  /** الزيادة الذرّية وتحديد الـ TTL — لا مسابقة عبر العمليات */
  private async incrResolved(key: string, ttlMs: TtlMs): Promise<number> {
    const count = await this.backend.incr(this.key(key), ttlMs);
    return count;
  }

  async check(key: string, _now: number = Date.now()): Promise<RateLimitResult> {
    const ttlMs = ttlForWindow(this.config.windowMs);
    const count = await this.incrResolved(key, ttlMs);
    if (count > this.config.limit) {
      // المفتاح ما زال موجودًا مع TTL — ناقص (للاختبار نلتزم retryAfter افتراضي)
      return { allowed: false, retryAfterMs: ttlMs };
    }
    return { allowed: true, retryAfterMs: 0 };
  }
}

/** مصنع محيّد: Redis limiter عند التوفر، Memory عند غياب (fallback آمن) */
export function createRateLimiterAsync(
  config: RateLimiterConfig,
  backend?: RedisBackend | null
): RateLimiterAsync {
  if (backend) return new RedisRateLimiter(backend, config);
  return new MemoryRateLimiterAsync(config);
}

/** تفاف حول MemoryRateLimiter الحالي — ليطابق الواجهة غير المتزامنة */
export class MemoryRateLimiterAsync implements RateLimiterAsync {
  private readonly inner: RateLimiter;
  constructor(config: RateLimiterConfig) {
    this.inner = new MemoryRateLimiter(config);
  }
  async check(key: string, now?: number): Promise<RateLimitResult> {
    return this.inner.check(key, now);
  }
}