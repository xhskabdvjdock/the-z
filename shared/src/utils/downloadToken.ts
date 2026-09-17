import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * توقيع روابط التحميل (HMAC) — يُستخدم لتأمين صفحة/واجهة التحميل العامة التي يرسلها
 * البوت للأعضاء عبر الأمر `,dw`، دون إجبارهم على تسجيل الدخول للوحة التحكم.
 *
 * الفكرة: البوت يوقّع الرابط بسر مشترك، واللوحة تتحقق من التوقيع. أي تعديل على
 * الرابط (أو انتهاء مدته) يُبطل الصلاحية، فيُطلب تسجيل دخول اللوحة بدلاً منها.
 */

export type DownloadTokenKind = "url" | "file";

/** مدة صلاحية الرابط الموقّع — ساعة واحدة افتراضيًا */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/**
 * السر المشترك بين البوت واللوحة. كلاهما يُشغَّل بنفس متغيرات البيئة على Render،
 * لذا يكفي ضبط أحد المتغيرات التالية. عند غيابها جميعًا تُعطَّل مسارات التحميل العامة
 * ويصبح التحميل متاحًا لجلسات لوحة التحكم المصرّح لها فقط (فشل آمن).
 */
export function getDownloadSecret(): string {
  return (
    process.env.DOWNLOADER_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.DISCORD_CLIENT_SECRET ||
    ""
  );
}

export function isDownloadSigningEnabled(): boolean {
  return getDownloadSecret().length > 0;
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** مفتاح التوقيع لكل نوع — للفصل بين توقيع الرابط وتوقيع الملف */
function tokenPayload(kind: DownloadTokenKind, id: string, expiresAt: number): string {
  return `${kind}\n${expiresAt}\n${id}`;
}

/**
 * ينشئ توقيعًا صالحًا لمعرّف محدّد (رابط أو ملف).
 * الصيغة: `<expiresAtMs>.<signature>` — آمنة للاستخدام في Query String.
 */
export function createDownloadToken(
  kind: DownloadTokenKind,
  id: string,
  ttlMs: number = DEFAULT_TTL_MS
): string | null {
  const secret = getDownloadSecret();
  if (!secret) return null;
  const expiresAt = Date.now() + ttlMs;
  const signature = signPayload(secret, tokenPayload(kind, id, expiresAt));
  return `${expiresAt}.${signature}`;
}

/** يتحقق من صحة التوقيع وعدم انتهاء صلاحيته */
export function verifyDownloadToken(
  kind: DownloadTokenKind,
  id: string,
  token: string | null | undefined
): boolean {
  const secret = getDownloadSecret();
  if (!secret || !token) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) return false;

  const expiresAt = Number(token.slice(0, separatorIndex));
  const signature = token.slice(separatorIndex + 1);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (Date.now() > expiresAt) return false;

  const expected = signPayload(secret, tokenPayload(kind, id, expiresAt));
  return safeEqual(signature, expected);
}

/** معرّف الملف الموقّع: `jobId/filename` */
export function fileTokenId(jobId: string, filename: string): string {
  return `${jobId}/${filename}`;
}
