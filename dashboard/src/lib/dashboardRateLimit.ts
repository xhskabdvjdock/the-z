const requests = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

export function checkRateLimit(userId: string, action: string): { allowed: boolean; remaining: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const timestamps = requests.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);
  if (valid.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  valid.push(now);
  requests.set(key, valid);
  return { allowed: true, remaining: MAX_REQUESTS - valid.length };
}

export function rateLimitOrThrow(userId: string, action: string) {
  const result = checkRateLimit(userId, action);
  if (!result.allowed) {
    throw new Error("تم تجاوز الحد المسموح — حاول مرة أخرى بعد دقيقة");
  }
}