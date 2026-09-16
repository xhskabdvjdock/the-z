import { Collection } from "../db/collection";

/** حاوية إحصائية مجمعة — سجل واحد لكل (سيرفر، فترة، مفتاح) بدل تخزين كل حدث */
export interface IAnalyticsBucket {
  /** `${guildId}:${bucket}:${bucketKey}` — مفتاح الفهرس */
  key: string;
  guildId: string;
  /** hour | day */
  bucket: "hour" | "day";
  /** "2026-09-16T14" للساعة، "2026-09-16" لليوم (UTC) */
  bucketKey: string;
  /** عدّادات قياسية: messages, commands, joins, leaves, voiceMinutes, xp, levelups, moderation_* */
  metrics: Record<string, number>;
  /** أكثر الأعضاء نشاطًا (مقتطع لأعلى 25) — للساعة فقط */
  topUsers?: Array<{ id: string; count: number }>;
  /** أكثر القنوات نشاطًا (مقتطع لأعلى 15) — للساعة فقط */
  topChannels?: Array<{ id: string; count: number }>;
  updatedAt: Date;
}

export const AnalyticsBucket = new Collection<IAnalyticsBucket>("analytics_buckets", "key", () => ({
  key: "",
  guildId: "",
  bucket: "hour",
  bucketKey: "",
  metrics: {},
  updatedAt: new Date()
}));
