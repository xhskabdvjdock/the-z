import type { IHeartbeat } from "@thez/shared";
import { createTtlCache } from "./apiCache";

export interface HealthIssue {
  severity: "error" | "warning";
  area: string;
  message: string;
}

export interface HealthData {
  checkedAt: string;
  bot: { online: boolean; latencyMs: number; uptimeSec: number; guilds: number; staleSec: number | null };
  database: { ok: boolean; ms: number };
  redis: { ok: boolean; ms: number; connected: boolean };
  scheduler: { tasks: number; run: number; failed: number };
  cache: { guildConfigSize: number; hits: number; misses: number };
  metrics: Record<string, number | Record<string, number>>;
  issues: HealthIssue[];
}

export interface HealthDeps {
  getHeartbeat(): Promise<IHeartbeat | null>;
  pingDb(): Promise<{ ok: boolean; ms: number }>;
  pingRedis(): Promise<{ ok: boolean; ms: number; connected: boolean }>;
  getConfig(guildId: string): Promise<any>;
  getChannels(guildId: string): Promise<Array<{ id: string; name: string }>>;
  getRoles(guildId: string): Promise<Array<{ id: string; name: string }>>;
}

const SNOWFLAKE_RE = /^\d{17,20}$/;
/** مسارات الإعدادات التي تشير لقنوات/رتب — تُفحص مقابل الكاش فقط */
const CHANNEL_PATHS = [
  ["islamicContent", "channelId"],
  ["suggestions", "channelId"],
  ["suggestions", "logChannelId"],
  ["movies", "channelId"],
  ["starboard", "channelId"],
  ["reactionRoles", "channelId"],
  ["welcome", "channelId"],
  ["leave", "channelId"]
];
/** مسارات الرتب — اللاحقة [] تعني مصفوفة معرّفات */
const ROLE_PATHS: string[][] = [
  ["jail", "roleId"],
  ["autoRole", "userRoleIds[]"],
  ["autoRole", "botRoleIds[]"],
  ["captcha", "unverifiedRoleId"]
];

function pickPath(obj: any, path: string[]): unknown {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

/** نبضة قديمة (>3 دقائق) تعني البوت متوقفًا أو المجدول عالقًا */
const STALE_HEARTBEAT_SEC = 180;

export async function getHealthData(guildId: string, deps: HealthDeps): Promise<HealthData> {
  const issues: HealthIssue[] = [];

  const [heartbeat, database, redis, config, channels, roles] = await Promise.all([
    deps.getHeartbeat().catch(() => null),
    deps.pingDb().catch(() => ({ ok: false, ms: -1 })),
    deps.pingRedis().catch(() => ({ ok: false, ms: -1, connected: false })),
    deps.getConfig(guildId).catch(() => null),
    deps.getChannels(guildId).catch(() => []),
    deps.getRoles(guildId).catch(() => [])
  ]);

  if (!database.ok) {
    issues.push({ severity: "error", area: "database", message: "تعذر الاتصال بقاعدة البيانات" });
  }

  let staleSec: number | null = null;
  if (!heartbeat) {
    issues.push({ severity: "error", area: "bot", message: "لا توجد نبضة من البوت — قد يكون متوقفًا" });
  } else {
    staleSec = Math.max(0, Math.floor((Date.now() - new Date(heartbeat.updatedAt).getTime()) / 1000));
    if (staleSec > STALE_HEARTBEAT_SEC) {
      issues.push({
        severity: "error",
        area: "bot",
        message: `نبضة البوت قديمة منذ ${staleSec} ثانية — تحقق من عمل البوت والمجدول`
      });
    }
    if (heartbeat.scheduler.failed > 0) {
      issues.push({
        severity: "warning",
        area: "scheduler",
        message: `مهام مجدول فاشلة: ${heartbeat.scheduler.failed}`
      });
    }
  }

  // تشخيص الإعدادات مقابل كاش ديسكورد (بلا REST إضافي هنا — القوائم مكشّنة أصلًا)
  if (config) {
    const channelIds = new Set(channels.map((c) => c.id));
    const roleIds = new Set(roles.map((r) => r.id));
    for (const path of CHANNEL_PATHS) {
      const value = pickPath(config, path);
      if (typeof value === "string" && SNOWFLAKE_RE.test(value) && !channelIds.has(value)) {
        issues.push({
          severity: "warning",
          area: "config",
          message: `قناة مفقودة في ${path.join(".")}: ${value}`
        });
      }
    }
    for (const path of ROLE_PATHS) {
      const last = path[path.length - 1];
      const values = last.endsWith("[]")
        ? (pickPath(config, [...path.slice(0, -1), last.slice(0, -2)]) as unknown)
        : [pickPath(config, path)];
      const ids = (Array.isArray(values) ? values : [values]).filter(
        (v): v is string => typeof v === "string" && SNOWFLAKE_RE.test(v)
      );
      for (const id of ids.slice(0, 20)) {
        if (!roleIds.has(id)) {
          issues.push({
            severity: "warning",
            area: "config",
            message: `رتبة مفقودة في ${path.join(".")}: ${id}`
          });
        }
      }
    }
    // رسائل مجدولة تشير لقنوات محذوفة (بحد أعلى 20)
    const scheduled = Array.isArray((config as any).scheduledMessages) ? (config as any).scheduledMessages : [];
    for (const msg of scheduled.slice(0, 20)) {
      if (msg?.enabled && typeof msg.channelId === "string" && SNOWFLAKE_RE.test(msg.channelId) && !channelIds.has(msg.channelId)) {
        issues.push({
          severity: "warning",
          area: "config",
          message: `رسالة مجدولة تشير لقناة محذوفة: ${msg.channelId}`
        });
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    bot: {
      online: !!heartbeat && (staleSec ?? Infinity) <= STALE_HEARTBEAT_SEC,
      latencyMs: heartbeat?.wsPingMs ?? -1,
      uptimeSec: heartbeat?.uptimeSec ?? 0,
      guilds: heartbeat?.guilds ?? 0,
      staleSec
    },
    database,
    redis,
    scheduler: heartbeat?.scheduler ?? { tasks: 0, run: 0, failed: 0 },
    cache: heartbeat?.cache ?? { guildConfigSize: 0, hits: 0, misses: 0 },
    metrics: (heartbeat?.metrics ?? {}) as Record<string, number | Record<string, number>>,
    issues
  };
}

/** كاش قصير لصفحة الصحة — 10 ثوانٍ، بحد أعلى 50 سيرفر */
const healthCache = createTtlCache<HealthData>(50, 10_000);

export async function getCachedHealthData(guildId: string, deps: HealthDeps): Promise<HealthData> {
  const cached = healthCache.get(guildId);
  if (cached) return cached;
  const data = await getHealthData(guildId, deps);
  healthCache.set(guildId, data);
  return data;
}
