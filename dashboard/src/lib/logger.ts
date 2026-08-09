/** إخفاء أي قيم تشبه أسرارًا (token/secret/key/password) داخل أي نص سجل */
export function redactSecrets(text: string): string {
  return text.replace(
    /([&?][A-Za-z0-9_-]*(?:token|secret|key|password)[A-Za-z0-9_-]*?=)[^&\s]+/gi,
    "$1[REDACTED]"
  );
}

/** سجل خطأ آمن على السيرفر: رسالة قصيرة + إخفاء أسرار (بدون رمي تفاصيل الحمولة) */
export function logError(label: string, err: unknown): void {
  const body =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === "string"
        ? err
        : JSON.stringify(err);
  console.error(`[${label}] ${redactSecrets(body)}`);
}