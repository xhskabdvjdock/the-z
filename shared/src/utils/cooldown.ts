/**
 * نظام Cooldown موحّد (لأوامر البوت، والردود التلقائية لاحقًا...).
 *
 * التصميم: `CooldownStore` هي الواجهة الوحيدة التي يتعامل معها الكود — التطبيق الحالي
 * هو MemoryCooldownStore في الذاكرة، ويمكن استبداله بـ RedisCooldownStore مستقبلًا
 * (عند إضافة Redis) **بدون تغيير أي أمر أو سطر استدعاء** — فقط حقن التطبيق الجديد.
 */

export interface CooldownStore {
  /** آخر طابع زمني (epoch ms) مسجّل للمفتاح، أو null إن لم يوجد */
  get(key: string): number | null;
  set(key: string, timestamp: number): void;
  delete(key: string): void;
}

/** تطبيق في الذاكرة — آمن للعمليات ويكفي للوضع الحالي */
export class MemoryCooldownStore implements CooldownStore {
  private readonly map = new Map<string, number>();
  /** حد أقصى قبل تنظيف المفاتيح المنتهية (وقاية من تضخّم الذاكرة) */
  private static readonly MAX_KEYS = 8192;

  get(key: string): number | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, timestamp: number): void {
    this.map.set(key, timestamp);
    if (this.map.size > MemoryCooldownStore.MAX_KEYS) this.pruneExpired(timestamp);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  /** عدد المفاتيح الحالية (مراقبة/اختبارات) */
  get size(): number {
    return this.map.size;
  }

  /** يزيل المفاتيح المنتهية فقط (أقدم أسبوع) — يُستدعى عند تجاوز السقف */
  private pruneExpired(now: number): void {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    for (const [key, ts] of this.map) {
      if (ts < cutoff) this.map.delete(key);
    }
  }
}

export interface CooldownCheck {
  allowed: boolean;
  remainingSeconds: number;
}

/**
 * يفحص ما إذا كان المفتاح ما زال في فترة البرودة.
 * @param store التخزين المشترك
 * @param key مفتاح فريد (يُوصى: `command:guildId:userId`)
 * @param cooldownSeconds مدة البرودة بالثواني (0 أو أقل = بدون برودة)
 */
export function checkCooldown(
  store: CooldownStore,
  key: string,
  cooldownSeconds: number,
  now: number = Date.now()
): CooldownCheck {
  if (!cooldownSeconds || cooldownSeconds <= 0) return { allowed: true, remainingSeconds: 0 };

  const last = store.get(key);
  if (last == null) return { allowed: true, remainingSeconds: 0 };

  const elapsedMs = now - last;
  const cooldownMs = cooldownSeconds * 1000;
  if (elapsedMs >= cooldownMs) return { allowed: true, remainingSeconds: 0 };

  return {
    allowed: false,
    remainingSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000)
  };
}

/** يبدأ فترة البرودة للمفتاح المعطى (يُستدعى عند بدء تنفيذ الإجراء فعليًا) */
export function registerCooldown(
  store: CooldownStore,
  key: string,
  now: number = Date.now()
): void {
  store.set(key, now);
}

/** مفتاح موحّد ومقسّم: `action:guildId:userId` */
export function getCooldownKey(action: string, guildId: string, userId: string): string {
  return `${action}:${guildId}:${userId}`;
}