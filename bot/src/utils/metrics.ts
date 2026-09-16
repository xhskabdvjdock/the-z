/**
 * عدّادات داخلية خفيفة لمراقبة صحة البوت — ذاكرة فقط، بلا أي كتابة لقاعدة البيانات.
 * تُستخدم لصفحة Server Health لاحقًا ولفحص الأداء.
 */

export interface MetricsSnapshot {
  messagesProcessed: number;
  messageProcessingMsTotal: number;
  commandsRun: number;
  interactionsHandled: number;
  dbReads: number;
  dbWrites: number;
  cacheHits: number;
  cacheMisses: number;
  schedulerJobsRun: number;
  schedulerJobsFailed: number;
  discordApiCalls: number;
  suggestionVotes: number;
  xpAccumulated: number;
  xpFlushed: number;
  errors: Record<string, number>;
  startedAt: number;
}

const counters: MetricsSnapshot = {
  messagesProcessed: 0,
  messageProcessingMsTotal: 0,
  commandsRun: 0,
  interactionsHandled: 0,
  dbReads: 0,
  dbWrites: 0,
  cacheHits: 0,
  cacheMisses: 0,
  schedulerJobsRun: 0,
  schedulerJobsFailed: 0,
  discordApiCalls: 0,
  suggestionVotes: 0,
  xpAccumulated: 0,
  xpFlushed: 0,
  errors: {},
  startedAt: Date.now()
};

/** حد أعلى لعدد مفاتيح الأخطاء حتى لا تنمو الذاكرة بلا حدود */
const MAX_ERROR_KEYS = 100;

export function recordMessageProcessed(durationMs: number): void {
  counters.messagesProcessed++;
  counters.messageProcessingMsTotal += durationMs;
}

export function recordCommandRun(): void {
  counters.commandsRun++;
}

export function recordInteractionHandled(): void {
  counters.interactionsHandled++;
}

export function recordDbRead(n = 1): void {
  counters.dbReads += n;
}

export function recordDbWrite(n = 1): void {
  counters.dbWrites += n;
}

export function recordCacheHit(): void {
  counters.cacheHits++;
}

export function recordCacheMiss(): void {
  counters.cacheMisses++;
}

export function recordSchedulerRun(failed = false): void {
  if (failed) counters.schedulerJobsFailed++;
  else counters.schedulerJobsRun++;
}

export function recordDiscordApiCall(n = 1): void {
  counters.discordApiCalls += n;
}

export function recordSuggestionVote(): void {
  counters.suggestionVotes++;
}

export function recordXpAccumulated(n = 1): void {
  counters.xpAccumulated += n;
}

export function recordXpFlushed(n = 1): void {
  counters.xpFlushed += n;
}

export function recordError(label: string): void {
  if (counters.errors[label] !== undefined) {
    counters.errors[label]++;
    return;
  }
  if (Object.keys(counters.errors).length >= MAX_ERROR_KEYS) return;
  counters.errors[label] = 1;
}

export function getMetrics(): MetricsSnapshot {
  return { ...counters, errors: { ...counters.errors } };
}

export function resetMetrics(): void {
  counters.messagesProcessed = 0;
  counters.messageProcessingMsTotal = 0;
  counters.commandsRun = 0;
  counters.interactionsHandled = 0;
  counters.dbReads = 0;
  counters.dbWrites = 0;
  counters.cacheHits = 0;
  counters.cacheMisses = 0;
  counters.schedulerJobsRun = 0;
  counters.schedulerJobsFailed = 0;
  counters.discordApiCalls = 0;
  counters.suggestionVotes = 0;
  counters.xpAccumulated = 0;
  counters.xpFlushed = 0;
  counters.errors = {};
  counters.startedAt = Date.now();
}
