/**
 * factory — نقطه الدمج الوحيدة للـ Redis في التطبيق.
 *
 * القاعدة: عند التوفر → Redis؛ عند الغياب → Memory fallback آمن للمهام المؤقتة فقط
 * (cooldowns / rate limits / كاش / عدّادات). البيانات الدائمة (DB) لا تمر من هنا أبدًا.
 * التحذير يظهر مرة واحدة عند بدء التشغيل (لا يُسجَّل أي بيانات اتصال).
 */

import { RedisBackend } from "./backend";
import { getBackend } from "./redisClient";
import { HybridCooldownStore } from "./cooldownStore";
import { RedisCacheImpl, RedisCache } from "./cache";
import { RedisCounterImpl, RedisCounter } from "./counter";
import { createRateLimiterAsync, RateLimiterAsync } from "./rateLimiter";
import { CooldownStore } from "../utils/cooldown";

let warnedFallback = false;

function noticeFallback(what: string): void {
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(`[redis] غير متاح — استخدام ذاكرة العملية كمخزن مؤقت (${what}). بيانات ثابتة غير متأثرة.`);
  }
}

/** كائن يحمل كل التطبيقات المشتركة (يحصل عليه البوت/اللوحة عند الإقلاع) */
export interface RedisServices {
  /** عدّادات ذرّية (AntiSpam/Raid) */
  counter: RedisCounter;
  /** كاش مؤقت مع TTL إجباري */
  cache: RedisCache;
  /** Rate limiter (async) للأنظمة عالية التردد */
  rateLimiter: RateLimiterAsync;
  /** هل نعمل على Redis فعليًا؟ */
  isRedis: boolean;
  /** الـ backend المستعمل (للاختبار) */
  backend: RedisBackend;
}

export function buildRedisServices(overrides?: { backend?: RedisBackend }): RedisServices {
  const { backend, isRedis } = overrides?.backend
    ? { backend: overrides.backend, isRedis: true }
    : getBackend();

  if (isRedis) return withRedis(backend);
  return withMemory(backend);
}

function withRedis(backend: RedisBackend): RedisServices & { isRedis: boolean } {
  return {
    counter: new RedisCounterImpl(backend),
    cache: new RedisCacheImpl(backend),
    rateLimiter: createRateLimiterAsync({ limit: 120, windowMs: 60_000 }, backend),
    isRedis: true,
    backend
  };
}

function withMemory(backend: RedisBackend): RedisServices & { isRedis: boolean } {
  noticeFallback("Redis services");
  return {
    counter: new RedisCounterImpl(backend),
    cache: new RedisCacheImpl(backend),
    rateLimiter: createRateLimiterAsync({ limit: 120, windowMs: 60_000 }, null),
    isRedis: false,
    backend
  };
}

/** للبوت واللوحة — حقن متوافق للحفاظ على واجهة CooldownStore نفسها */
export function createCooldownStore(
  backend?: RedisBackend | null,
  logNotice?: (msg: string) => void
): CooldownStore {
  if (backend) return new HybridCooldownStore(backend, logNotice);
  const { backend: fallback } = getBackend();
  noticeFallback("cooldown");
  return new HybridCooldownStore(fallback, logNotice);
}