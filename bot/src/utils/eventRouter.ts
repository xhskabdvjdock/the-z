import { logError } from "./logger";

/**
 * موجّه أحداث خفيف — أساس قابل للتوسع (تتبع الدعوات، أتمتة مستقبلية)
 * بدل إضافة مستمعين مكررين لنفس الحدث.
 *
 * القواعد: توجيه متزامن خفيف، لا استعلام قاعدة بيانات هنا،
 * كل معالج معزول بخطئه، وإرجاع true من معالج يوقف السلسلة.
 */

export type EventHandler<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => Promise<boolean | void>;

interface Entry {
  id: string;
  handler: EventHandler<any>;
}

const routes = new Map<string, Entry[]>();

/** تسجيل معالج لحدث — يُستبدل إن وُجد نفس المعرف */
export function onEvent<TArgs extends unknown[]>(
  event: string,
  id: string,
  handler: EventHandler<TArgs>
): void {
  const list = routes.get(event) ?? [];
  const existing = list.findIndex((e) => e.id === id);
  const entry: Entry = { id, handler: handler as EventHandler<any> };
  if (existing >= 0) list[existing] = entry;
  else list.push(entry);
  routes.set(event, list);
}

export function offEvent(event: string, id: string): void {
  const list = routes.get(event);
  if (!list) return;
  routes.set(
    event,
    list.filter((e) => e.id !== id)
  );
}

/**
 * توزيع حدث على معالجاته بالترتيب — أول معالج يعيد true يوقف السلسلة.
 * يعيد true إن أوقف أحد المعالجات السلسلة.
 */
export async function dispatchEvent(event: string, ...args: unknown[]): Promise<boolean> {
  const list = routes.get(event);
  if (!list?.length) return false;
  for (const entry of list) {
    try {
      const stop = await entry.handler(...args);
      if (stop === true) return true;
    } catch (err) {
      logError(`event-router/${event}/${entry.id}`, err);
    }
  }
  return false;
}

/** للاختبار والمراقبة */
export function eventHandlerCount(event: string): number {
  return routes.get(event)?.length ?? 0;
}

export function clearEventRoutes(): void {
  routes.clear();
}
