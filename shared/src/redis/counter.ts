/**
 * RedisCounter — عدّادات ذرّية (INCR) مع TTL إجباري.
 * مثالية لعدادات الـ AntiSpam / AntiRaid / AntiNuke التي تصلها أحداث متزامنة.
 * لا تُستخدم GET → تعديل محلي → SET أبدًا؛ العدّ يتم داخل Redis (atomic).
 */

import { RedisBackend, TtlMs } from "./backend";

export interface RedisCounter {
  /** زيادة عدّاد بمقدار 1 — ترجع القيمة الجديدة */
  increment(key: string, ttlMs: TtlMs): Promise<number>;
  /** القراءة الحالية دون تغيير */
  get(key: string): Promise<number>;
  /** إعادة تعيين */
  reset(key: string): Promise<void>;
}

/** أداة مساعدة لبناء مفاتيح منظمة عبر بادئة + أجزاء */
export function counterKey(prefix: string, ...parts: (string | number)[]): string {
  return [prefix, ...parts].join(":");
}

export class RedisCounterImpl implements RedisCounter {
  constructor(private readonly backend: RedisBackend) {}

  private fullKey(key: string): string {
    return `thez:counter:${key}`;
  }

  async increment(key: string, ttlMs: TtlMs): Promise<number> {
    if (!(ttlMs > 0)) throw new Error("RedisCounter: TTL مطلوب لكل عدّاد");
    return this.backend.incr(this.fullKey(key), ttlMs);
  }

  async get(key: string): Promise<number> {
    const raw = await this.backend.getEx(this.fullKey(key));
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  async reset(key: string): Promise<void> {
    await this.backend.delete(this.fullKey(key));
  }
}