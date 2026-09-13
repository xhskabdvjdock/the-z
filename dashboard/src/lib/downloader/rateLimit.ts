const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;

const memory = new Map<string, number[]>();

export async function checkRateLimit(key: string, max: number = MAX_REQUESTS, windowMs: number = WINDOW_MS): Promise<{ allowed: boolean }> {
  const now = Date.now();
  const timestamps = (memory.get(key) ?? []).filter((t: number) => now - t < windowMs);
  if (timestamps.length >= max) return { allowed: false };
  timestamps.push(now);
  memory.set(key, timestamps);
  // تنظيف دوري
  if (memory.size > 1000) {
    for (const [k, v] of memory) {
      if (v[v.length - 1] < now - windowMs) memory.delete(k);
    }
  }
  return { allowed: true };
}