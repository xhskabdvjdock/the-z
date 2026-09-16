import { Heartbeat } from "@thez/shared";
import { ExtendedClient } from "../../client";
import { getBackend } from "@thez/shared";
import { logError } from "../../utils/logger";
import { getMetrics, recordHealthCheck } from "../../utils/metrics";
import { isSchedulerRunning, registerRecurring, schedulerTaskCount } from "../../scheduler/scheduler";

/** كل دقيقة — كتابة واحدة فقط */
export const HEARTBEAT_MS = 60_000;

const bootAt = Date.now();

async function writeHeartbeat(client: ExtendedClient): Promise<void> {
  try {
    const metrics = getMetrics();
    const { isRedis } = getBackend();
    await Heartbeat.findOneAndUpdate(
      { id: "bot" },
      {
        $set: {
          id: "bot",
          updatedAt: new Date(),
          uptimeSec: Math.floor((Date.now() - bootAt) / 1000),
          wsPingMs: client.ws.ping >= 0 ? client.ws.ping : -1,
          guilds: client.guilds.cache.size,
          scheduler: {
            tasks: schedulerTaskCount(),
            run: metrics.schedulerJobsRun,
            failed: metrics.schedulerJobsFailed
          },
          metrics: {
            messagesProcessed: metrics.messagesProcessed,
            commandsRun: metrics.commandsRun,
            interactionsHandled: metrics.interactionsHandled,
            dbReads: metrics.dbReads,
            dbWrites: metrics.dbWrites,
            discordApiCalls: metrics.discordApiCalls,
            analyticsEvents: metrics.analyticsEvents,
            analyticsFlushed: metrics.analyticsFlushed,
            starboardReactions: metrics.starboardReactions,
            starboardApiUpdates: metrics.starboardApiUpdates,
            errors: metrics.errors
          },
          cache: {
            guildConfigSize: client.guildConfigCache.size,
            hits: metrics.cacheHits,
            misses: metrics.cacheMisses
          },
          redis: { connected: isRedis }
        }
      },
      { upsert: true }
    );
    recordHealthCheck();
  } catch (err) {
    logError("heartbeat", err);
  }
}

export function registerHeartbeatScheduler(client: ExtendedClient): void {
  registerRecurring("heartbeat", HEARTBEAT_MS, async (c) => {
    if (!isSchedulerRunning()) return;
    await writeHeartbeat(c);
  });
}
