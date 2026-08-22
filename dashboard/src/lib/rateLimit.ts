/**
 * إعادة تصدير موحّدة من @thez/shared — تطبيق RateLimiter واحد للمشروع كله
 * (لوحة + بوت لاحقًا) قابل للاستبدال بـ Redis دون تغيير مواقع الاستدعاء.
 */
export { MemoryRateLimiter, apiRateLimiter } from "@thez/shared";
export type { RateLimiter, RateLimiterConfig, RateLimitResult } from "@thez/shared";