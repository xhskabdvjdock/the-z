import { config } from "../config";

/** أسرار تُستبدل بـ [REDACTED] في أي نص سجل حتى لا تتسرب في الآثار/logs */
const SECRETS = [
  config.token,
  config.databaseUrl,
  config.clientSecret,
  process.env.DISCORD_BOT_TOKEN,
  process.env.DISCORD_CLIENT_SECRET,
  process.env.DATABASE_URL
].filter((v): v is string => typeof v === "string" && v.length > 4);

/** تنظيف رسالة الخطأ: استخراج الرسالة (بدون الآثار الداخلية) + إخفاء الأسرار */
export function sanitizeError(err: unknown): string {
  if (err == null) return String(err);
  let text: string;
  if (err instanceof Error) {
    text = `${err.name}: ${err.message}`;
    if (err.stack) text += `\nStack: ${err.stack.split("\n").slice(0, 6).join("\n")}`;
  } else {
    text = typeof err === "string" ? err : JSON.stringify(err);
  }

  // تعميم: إخفاء أي قيم تشبه أسرارًا (token/secret/key/password) داخل URLs أو نصوص
  text = text.replace(
    /([&?][A-Za-z0-9_-]*(?:token|secret|key|password)[A-Za-z0-9_-]*?=)[^&\s]+/gi,
    "$1[REDACTED]"
  );

  for (const secret of SECRETS) {
    if (secret) text = text.split(secret).join("[REDACTED]");
  }
  return text;
}

/** سجل خطأ آمن يحجب الأسرار ويبقي رسالة قصيرة قابلة للتصفّح */
export function logError(label: string, err: unknown): void {
  console.error(`[${label}] ${sanitizeError(err)}`);
}

export function logInfo(label: string, message: string): void {
  console.log(`[${label}] ${message}`);
}