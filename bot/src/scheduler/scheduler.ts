import { ExtendedClient } from "../client";
import { logError, logInfo } from "../utils/logger";
import { recordSchedulerRun } from "../utils/metrics";

/**
 * المجدول المركزي الوحيد في البوت — بديل كل الـ setInterval المتفرقة
 * ومؤقتات كل سيرفر. يعمل بحلقة setTimeout واحدة متكيفة:
 * يستيقظ عند أقرب مهمة مستحقة (بحد أدنى 5 ثوانٍ وأقصى 60 ثانية)،
 * وينام عند عدم وجود عمل بدل الـ busy loop.
 */

export interface RecurringTask {
  id: string;
  intervalMs: number;
  nextRunAt: number;
  run: (client: ExtendedClient) => Promise<void>;
}

export interface OneShotJob {
  id: string;
  runAt: number;
  run: (client: ExtendedClient) => Promise<void>;
}

interface FlushHandler {
  id: string;
  flush: () => Promise<void>;
}

const MIN_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;
const SHUTDOWN_FLUSH_TIMEOUT_MS = 15_000;

const recurring = new Map<string, RecurringTask>();
const oneShots = new Map<string, OneShotJob>();
const flushHandlers = new Map<string, FlushHandler>();

let clientRef: ExtendedClient | null = null;
let timer: NodeJS.Timeout | null = null;
let ticking = false;
let started = false;

/** تسجيل مهمة دورية (تُنفَّذ كل intervalMs) — تُستبدل إن وُجدت بنفس المعرف */
export function registerRecurring(
  id: string,
  intervalMs: number,
  run: (client: ExtendedClient) => Promise<void>,
  opts?: { startDelayMs?: number }
): void {
  recurring.set(id, {
    id,
    intervalMs: Math.max(MIN_DELAY_MS, intervalMs),
    nextRunAt: Date.now() + (opts?.startDelayMs ?? intervalMs),
    run
  });
  wakeIfSooner();
}

export function unregisterRecurring(id: string): void {
  recurring.delete(id);
}

/** مهمة تُنفَّذ مرة واحدة في وقت محدد (للمستقبل: giveaways/backups) */
export function scheduleOnce(id: string, runAt: number, run: (client: ExtendedClient) => Promise<void>): void {
  oneShots.set(id, { id, runAt, run });
  wakeIfSooner();
}

export function cancelOnce(id: string): void {
  oneShots.delete(id);
}

/** معالج تفريغ يُستدعى عند الإيقاف (XP/AFK/أصوات معلقة) — بالترتيب */
export function registerFlushHandler(id: string, flush: () => Promise<void>): void {
  flushHandlers.set(id, { id, flush });
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function computeNextDelayMs(now: number): number {
  let nearest = Infinity;
  for (const task of recurring.values()) {
    if (task.nextRunAt < nearest) nearest = task.nextRunAt;
  }
  for (const job of oneShots.values()) {
    if (job.runAt < nearest) nearest = job.runAt;
  }
  if (nearest === Infinity) return MAX_DELAY_MS;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, nearest - now));
}

function scheduleNext(): void {
  if (!started || !clientRef) return;
  clearTimer();
  timer = setTimeout(() => {
    void tick();
  }, computeNextDelayMs(Date.now()));
  // لا نمنع خروج العملية بسبب المؤقت وحده
  timer.unref?.();
}

/** إن كان هناك عمل مستحق أقرب من الموعد المجدول، استيقظ مبكرًا */
function wakeIfSooner(): void {
  if (!started || !clientRef || ticking) return;
  scheduleNext();
}

async function tick(): Promise<void> {
  timer = null;
  if (!started || !clientRef || ticking) {
    scheduleNext();
    return;
  }
  ticking = true;
  const client = clientRef;
  const now = Date.now();

  try {
    for (const task of recurring.values()) {
      if (task.nextRunAt > now) continue;
      task.nextRunAt = now + task.intervalMs;
      try {
        await task.run(client);
        recordSchedulerRun(false);
      } catch (err) {
        recordSchedulerRun(true);
        logError(`scheduler/${task.id}`, err);
      }
    }

    for (const job of [...oneShots.values()]) {
      if (job.runAt > now) continue;
      oneShots.delete(job.id);
      try {
        await job.run(client);
        recordSchedulerRun(false);
      } catch (err) {
        recordSchedulerRun(true);
        logError(`scheduler/${job.id}`, err);
      }
    }
  } finally {
    ticking = false;
    scheduleNext();
  }
}

export function startScheduler(client: ExtendedClient): void {
  if (started) return;
  started = true;
  clientRef = client;
  logInfo("scheduler", "بدء المجدول المركزي");
  scheduleNext();
}

/** إيقاف المجدول + تفريغ كل المعلَّق بمهلة آمنة (يُستدعى من gracefulShutdown) */
export async function stopScheduler(): Promise<void> {
  started = false;
  clearTimer();
  clientRef = null;
  if (flushHandlers.size === 0) return;
  logInfo("scheduler", `تفريغ ${flushHandlers.size} معالجات معلقة...`);
  const deadline = Date.now() + SHUTDOWN_FLUSH_TIMEOUT_MS;
  for (const handler of flushHandlers.values()) {
    if (Date.now() >= deadline) {
      logError("scheduler/flush", new Error(`انتهت مهلة التفريغ عند ${handler.id}`));
      break;
    }
    try {
      await handler.flush();
    } catch (err) {
      logError(`scheduler/flush/${handler.id}`, err);
    }
  }
}

/** للاختبار والمراقبة */
export function schedulerTaskCount(): number {
  return recurring.size + oneShots.size;
}

export function isSchedulerRunning(): boolean {
  return started;
}
