/**
 * عميل Redis مركزي (lazy singleton) — يُقرأ من البيئة فقط.
 * ولا تُسجَّل أي بيانات اتصال (مفتاح/كلمة مرور) في أي log.
 */

import { Redis } from "ioredis";
import { RedisBackend, RedisBackendRedis, MemoryRedisBackend } from "./backend";

const lastErrorLoggedAt = { at: 0 };

/** هل Redis مفعّل في هذه البيئة؟ */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

function createClient(url: string): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 3000) || 3000,
    enableReadyCheck: true,
    retryStrategy: (times) => (times > 3 ? null : Math.min(500 * times, 2000)),
    maxRetriesPerRequest: 0
  });

  client.on("error", (err) => {
    if (Date.now() - lastErrorLoggedAt.at > 60_000) {
      lastErrorLoggedAt.at = Date.now();
      const msg = (err as Error).message ?? "connection error";
      console.warn("[redis] غير متاح حاليًا: " + (msg.slice(0, 120) || "connection error"));
    }
  });

  return client;
}

let singleton: Redis | null = null;

export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!singleton) singleton = createClient(url);
  return singleton;
}

/** المصدر الوحيد للـ backend — يفضّل Redis الحقيقي، والـ fallback آمن للمهام المؤقتة */
export function getBackend(): { backend: RedisBackend; isRedis: boolean } {
  const client = getRedisClient();
  if (!client) return { backend: new MemoryRedisBackend(), isRedis: false };
  return { backend: new RedisBackendRedis(client), isRedis: true };
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    return (await client.ping()) === "PONG";
  } catch {
    return false;
  }
}