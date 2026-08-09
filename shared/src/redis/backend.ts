/**
 * طبقة RedisBackend — الواجهة الوحيدة التي يعتمد عليها كل مكوّن Redis في المشروع.
 * تنفيذان: حقيقي (ioredis) ومحاكي في الذاكرة (لاختبارات الوحدات والبيئات بلا Redis).
 * ممنوع تسجيل عنوان/كلمة مرور Redis في أي log.
 */

export type TtlMs = number;

export interface RedisBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: TtlMs): Promise<void>;
  delete(key: string): Promise<void>;
  incr(key: string, ttlMs: TtlMs): Promise<number>;
  getEx(key: string): Promise<string | null>;
  expire(key: string, ttlMs: TtlMs): Promise<void>;
  ping(): Promise<boolean>;
}

/** بادئات الأنظمة (namespace) لمنع التصادم بين المكوّنات */
export const NS = {
  cooldown: "thez:cooldown",
  ratelimit: "thez:ratelimit",
  spam: "thez:spam",
  raid: "thez:raid",
  cache: "thez:cache",
  counter: "thez:counter"
} as const;

export function nsKey(namespace: string, ...parts: (string | number)[]): string {
  return [namespace, ...parts].join(":");
}

/** محاكي في الذاكرة — cl للاختبارات وللـ fallback الآمن */
export class MemoryRedisBackend implements RedisBackend {
  private readonly store = new Map<string, { value: string; expiresAt: number | null }>();

  constructor(private readonly now: () => number = Date.now) {}

  private evictIfExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt != null && entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.evictIfExpired(key)) return null;
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlMs: TtlMs): Promise<void> {
    this.store.set(key, { value, expiresAt: this.now() + Math.max(1_000, ttlMs) });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlMs: TtlMs): Promise<number> {
    if (this.evictIfExpired(key)) this.store.delete(key);
    const existing = this.store.get(key);
    const next = existing ? Number(existing.value) + 1 : 1;
    this.store.set(key, { value: String(next), expiresAt: this.now() + Math.max(1_000, ttlMs) });
    return next;
  }

  async getEx(key: string): Promise<string | null> {
    return this.get(key);
  }

  async expire(key: string, ttlMs: TtlMs): Promise<void> {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = this.now() + Math.max(1_000, ttlMs);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  get size(): number {
    return this.store.size;
  }
}

/** التنفيذ الحقيقي عبر ioredis — INCR و EXPIRE ضمني Atomic (multi) */
import { Redis } from "ioredis";

export class RedisBackendRedis implements RedisBackend {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs: TtlMs): Promise<void> {
    await this.client.set(key, value, "PX", Math.max(1_000, ttlMs));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string, ttlMs: TtlMs): Promise<number> {
    const result = await this.client
      .multi()
      .incr(key)
      .expire(key, Math.ceil(Math.max(1_000, ttlMs) / 1_000))
      .exec();
    return Number(result?.[0]?.[1] ?? 1);
  }

  async getEx(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async expire(key: string, ttlMs: TtlMs): Promise<void> {
    await this.client.expire(key, Math.ceil(Math.max(1_000, ttlMs) / 1_000));
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}
