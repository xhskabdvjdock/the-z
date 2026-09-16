import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { AnalyticsBucket, LevelUser, Ticket } from "@thez/shared";
import { getGuildChannels, getGuildInfo } from "@/lib/discord";
import { requireApiGuild } from "@/lib/apiAuth";
import { createTtlCache } from "@/lib/apiCache";

type RangeKey = "24h" | "7d" | "30d" | "90d";

/** كاش قصير لنتائج التجميع — 30 ثانية، بحد أعلى 200 مدخل */
const routeCache = createTtlCache<unknown>(200, 30_000);

function parseRange(value: string | null): RangeKey {
  if (value === "24h" || value === "7d" || value === "30d" || value === "90d") return value;
  return "7d";
}

function daysForRange(range: RangeKey): number {
  if (range === "24h") return 1;
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 90;
}

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const guildId = params.guildId;
  const auth = await requireApiGuild(guildId);
  if (!auth.ok) return auth.response;

  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const cacheKey = `${guildId}:${range}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  await ensureDb();
  const days = daysForRange(range);
  const now = new Date();

  // الحاويات: يومية للنطاقات الطويلة، وساعية للأسبوع (بحد أعلى 168 مستندًا)
  const useHourly = days <= 7;
  const bucket: "hour" | "day" = useHourly ? "hour" : "day";

  const [buckets, guild, topUsers, tickets, channels] = await Promise.all([
    AnalyticsBucket.find({ guildId, bucket }).lean().catch(() => []),
    getGuildInfo(guildId).catch(() => null),
    LevelUser.find({ guildId }).sort({ totalXp: -1 }).limit(5).lean().catch(() => []),
    Ticket.find({ guildId }).lean().catch(() => []),
    getGuildChannels(guildId).catch(() => [])
  ]);

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString().slice(0, 10);
  const inRange = (buckets as any[]).filter((b) => (b.bucketKey ?? "") >= cutoff);

  const sum = (metric: string): number =>
    inRange.reduce((acc, b) => acc + Number(b.metrics?.[metric] ?? 0), 0);

  // سلسلة زمنية يومية مدمجة (من الساعية أو اليومية)
  const byDay = new Map<string, { messages: number; joins: number; leaves: number; commands: number }>();
  for (const b of inRange) {
    const day = String(b.bucketKey ?? "").slice(0, 10);
    if (!day) continue;
    const row = byDay.get(day) ?? { messages: 0, joins: 0, leaves: 0, commands: 0 };
    row.messages += Number(b.metrics?.messages ?? 0);
    row.joins += Number(b.metrics?.joins ?? 0);
    row.leaves += Number(b.metrics?.leaves ?? 0);
    row.commands += Number(b.metrics?.commands ?? 0);
    byDay.set(day, row);
  }
  const activity = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));

  // تجميع الأوامر والإجراءات من كل الحاويات
  const commandCounts = new Map<string, number>();
  const moderationBreakdown = new Map<string, number>();
  for (const b of inRange) {
    for (const [k, v] of Object.entries((b.metrics ?? {}) as Record<string, unknown>)) {
      const n = Number(v ?? 0);
      if (k.startsWith("command_")) commandCounts.set(k.slice(8), (commandCounts.get(k.slice(8)) ?? 0) + n);
      else if (k.startsWith("moderation_"))
        moderationBreakdown.set(k.slice(11), (moderationBreakdown.get(k.slice(11)) ?? 0) + n);
    }
  }
  const topCommands = [...commandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // أكثر القنوات نشاطًا مع أسمائها (من آخر حاوية ساعة)
  const channelNames = new Map(channels.map((c: any) => [c.id, c.name]));
  const channelTotals = new Map<string, number>();
  for (const b of inRange) {
    for (const tc of (b.topChannels ?? []) as Array<{ id: string; count: number }>) {
      channelTotals.set(tc.id, (channelTotals.get(tc.id) ?? 0) + tc.count);
    }
  }
  const topChannels = [...channelTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: channelNames.get(id) ?? id.slice(0, 8), count }));

  // أكثر الأعضاء نشاطًا (معرّفات فقط — الأسماء حساسة وتتطلب REST إضافيًا)
  const userTotals = new Map<string, number>();
  for (const b of inRange) {
    for (const tu of (b.topUsers ?? []) as Array<{ id: string; count: number }>) {
      userTotals.set(tu.id, (userTotals.get(tu.id) ?? 0) + tu.count);
    }
  }
  const topMembers = [...userTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  const ticketsOpen = (tickets as any[]).filter((t: any) => t.status === "open" || t.status === "pending").length;
  const memberCount = (guild as any)?.approximate_member_count ?? (guild as any)?.member_count ?? 0;

  const payload = {
    memberCount,
    totalMessages: sum("messages"),
    moderationActions: sum("moderation"),
    ticketsOpen,
    commands: sum("commands"),
    voiceMinutes: sum("voiceMinutes"),
    voiceSessions: sum("voiceSessions"),
    joins: sum("joins"),
    leaves: sum("leaves"),
    xp: sum("xp"),
    levelups: sum("levelups"),
    moderationBreakdown: [...moderationBreakdown.entries()].map(([action, count]) => ({ action, count })),
    topCommands,
    topChannels,
    topMembers,
    activity,
    topUsers,
    bucket,
    days
  };

  routeCache.set(cacheKey, payload);
  return NextResponse.json(payload);
}
