/**
 * RedisCache — كاش مؤقت (TTL إجباري) فوق RedisBackend.
 * يستخدم لأي بيانات مؤقتة عالية التردد (مثل كاش اللوحة/الإعدادات المؤقتة).
 * البيانات الدائمة تبقي في قاعدة البيانات — Redis ليس مصدر حقيقة أبدًا.
 */

import { RedisBackend, NS, nsKey, TtlMs } from "./backend";

export interface RedisCache {
  /** جلب قيمة (null إذا غائبة/منتهية) */
  get<T>(key: string): Promise<T | null>;
  /** تخزين قيمة بتسلسل JSON مع TTL إجباري */
  set<T>(key: string, value: T, ttlMs: TtlMs): Promise<void>;
  /** حذف مفتاح واحد */
  delete(key: string): Promise<void>;
  /** حذف عدة مفاتيح (لمسح كامل كاش سيرفر مثلًا) */
  deleteMany(keys: string[]): Promise<void>;
}

export class RedisCacheImpl implements RedisCache {
  constructor(
    private readonly backend: RedisBackend,
    private readonly ttlFallback: TtlMs = 60_000
  ) {}

  private fullKey(key: string): string {
    return nsKey(NS.cache, key);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.backend.get(this.fullKey(key));
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: TtlMs): Promise<void> {
    await this.backend.set(this.fullKey(key), JSON.stringify(value), ttlMs > 0 ? ttlMs : this.ttlFallback);
  }

  async delete(key: string): Promise<void> {
    await this.backend.delete(this.fullKey(key));
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) await this.backend.delete(this.fullKey(key));
  }
}