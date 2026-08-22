/**
 * HybridCooldownStore — ينفذ واجهة CooldownStore الحالية (sync) دون تغيير أي أمر:
 *  - القراءة/الكتابة المحلية فورية (سلوك غير مسدود تمامًا كما كان Memory).
 *  - الكتابة تُمرَّر إلى Redis خلف الكواليس مع TTL (async fire-and-forget) —
 *    بذلك بين العمليات تصل البرودة عبر Redis عند التوزيع.
 *  - إذا Redis غير متاح: نتكمل محليًا (fallback آمن للمؤقتات فقط) ونلاحظ warn واحدًا.
 * TTL: كل مفتاح مؤقت له انتهاء إجباري (vo: أقصى cooldown تفترض أيامًا).
 */

import { CooldownStore } from "../utils/cooldown";
import { RedisBackend, NS, TtlMs } from "./backend";

/** الحد الأقصى لصنع cooldown (3 أشهر للاحتياط) — لكل مفتاح TTL إجباري */
export const COOLDOWN_MAX_TTL_MS: TtlMs = 90 * 24 * 60 * 60 * 1000;

export class HybridCooldownStore implements CooldownStore {
  /** حد أقصى للمفاتيح المحلية قبل تقليم القديم (وقاية من تضخّم الذاكرة) */
  private static readonly MAX_LOCAL_KEYS = 8192;

  private readonly local = new Map<string, number>();

  constructor(
    private readonly backend: RedisBackend,
    private readonly logNotice: (msg: string) => void = () => {}
  ) {}

  private fullKey(key: string): string {
    return `${NS.cooldown}:${key}`;
  }

  get(key: string): number | null {
    const localTs = this.local.get(key);
    if (localTs != null) return localTs;
    return null;
  }

  set(key: string, timestamp: number): void {
    this.local.set(key, timestamp);
    if (this.local.size > HybridCooldownStore.MAX_LOCAL_KEYS) this.pruneLocal();
    const remote = this.fullKey(key);
    this.backend
      .set(remote, String(timestamp), COOLDOWN_MAX_TTL_MS)
      .catch(() => this.logNotice("redis cooldown write failed — in-memory fallback only"));
  }

  delete(key: string): void {
    this.local.delete(key);
    this.backend.delete(this.fullKey(key)).catch(() => undefined);
  }

  /** يزيل المفاتيح الأقدم من 7 أيام فقط — لا يؤثر على برودة فعالة */
  private pruneLocal(): void {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [key, ts] of this.local) {
      if (ts < cutoff) this.local.delete(key);
    }
  }
}