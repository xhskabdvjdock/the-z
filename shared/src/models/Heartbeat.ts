import { Collection } from "../db/collection";

/** نبضة البوت — يكتبها المجدول المركزي مرة كل دقيقة لتقرأها صفحة الصحة */
export interface IHeartbeat {
  id: string;
  updatedAt: Date;
  uptimeSec: number;
  wsPingMs: number;
  guilds: number;
  scheduler: { tasks: number; run: number; failed: number };
  metrics: Record<string, number | Record<string, number>>;
  cache: { guildConfigSize: number; hits: number; misses: number };
  redis: { connected: boolean };
}

export const Heartbeat = new Collection<IHeartbeat>("heartbeats", "id", () => ({
  id: "bot",
  updatedAt: new Date(),
  uptimeSec: 0,
  wsPingMs: -1,
  guilds: 0,
  scheduler: { tasks: 0, run: 0, failed: 0 },
  metrics: {},
  cache: { guildConfigSize: 0, hits: 0, misses: 0 },
  redis: { connected: false }
}));
