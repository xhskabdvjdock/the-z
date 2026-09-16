/**
 * كاش TTL محدود الحجم لمسارات الداشبورد — يمنع تكرار التجميعات المكلفة
 * عند التحديثات المتتالية. بلا أي اعتماد على Next.js ليسهل اختباره.
 */
export interface TtlCache<T> {
  get(key: string): T | null;
  set(key: string, value: T): void;
  clear(): void;
  readonly size: number;
}

export function createTtlCache<T>(maxEntries: number, ttlMs: number): TtlCache<T> {
  const store = new Map<string, { data: T; expiresAt: number }>();
  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.data;
    },
    set(key: string, value: T): void {
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
    },
    clear(): void {
      store.clear();
    },
    get size(): number {
      return store.size;
    }
  };
}
