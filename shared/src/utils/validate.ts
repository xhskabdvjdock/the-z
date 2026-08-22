/**
 * أدوات تحقّق من المدخلات (بدون أي مكتبة خارجية) — تُستخدم في:
 * - واجهات الداشبورد (REST API Routes + Server Actions عبر shared وصفي)
 * - التحقق من المعرّفات الواردة من العملاء قبل أي استخدام
 */

/** معرّف Discord Snowflake: 17-20 رقمًا */
const SNOWFLAKE_RE = /^\d{17,20}$/;

export function isSnowflakeId(value: unknown): value is string {
  return typeof value === "string" && SNOWFLAKE_RE.test(value.trim());
}

/** إرجاع سلسلة نصية مقيدة الطول أو null */
export function getSanitizedString(
  value: unknown,
  maxLength: number,
  minLength = 0
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) return null;
  return trimmed;
}

/** إرجاع عدد صحيح في النطاق [min, max] أو fallback عند عدم الصلاحية */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(asNumber)));
}

/** تحقّق من قيمة تنتمي لقائمة (enum-like) — يقيّد open-ended inputs */
export function isEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isBooleanValue(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** مصفوفة نصوص مع قيود الحجم لكل عنصر وعدد العناصر (بدون تكرار) */
export function getStringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number
): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > maxItems) return null;
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > maxItemLength) return null;
    if (!cleaned.includes(item)) cleaned.push(item);
  }
  return cleaned;
}

/** مدة زمنية (بالثواني) ضمن نطاق — للـ timeout/الدورات */
export function getDurationSeconds(value: unknown, min: number, max: number): number | null {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber) || asNumber < min || asNumber > max) return null;
  return Math.trunc(asNumber);
}

/** أولوية of تدقيق: لا يسمح لأي قيمة خارج النطاق بالمرور */
export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}