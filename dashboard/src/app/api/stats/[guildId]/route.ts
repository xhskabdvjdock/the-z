import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { GuildConfig, LevelUser, ModerationLog, ActionLog, Ticket } from "@thez/shared";
import { getGuildInfo } from "@/lib/discord";

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDb();
  const guildId = params.guildId;

  const [guild, topUsers, actionLogs, modLogs, tickets] = await Promise.all([
    getGuildInfo(guildId).catch(() => null),
    LevelUser.find({ guildId }).sort({ totalXp: -1 }).limit(5).lean().catch(() => []),
    ActionLog.find({ guildId }).lean().catch(() => []),
    ModerationLog.find({ guildId }).lean().catch(() => []),
    Ticket.find({ guildId }).lean().catch(() => [])
  ]);

  const memberCount = guild?.approximate_member_count ?? guild?.member_count ?? 0;
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const moderationActions = [...(actionLogs as any[]), ...(modLogs as any[])].filter((log: any) => {
    const t = new Date(log.createdAt ?? log.timestamp ?? 0).getTime();
    return t >= sevenDaysAgo;
  }).length;

  const ticketsOpen = (tickets as any[]).filter((t: any) => t.status === "open" || t.status === "pending").length;

  const activity: Array<{ date: string; messages: number; joins: number; leaves: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const count = [...(actionLogs as any[]), ...(modLogs as any[])].filter((log: any) => {
      const ld = new Date(log.createdAt ?? log.timestamp ?? 0).toISOString().slice(0, 10);
      return ld === dateStr;
    }).length;
    activity.push({ date: dateStr, messages: count, joins: 0, leaves: 0 });
  }

  return NextResponse.json({
    memberCount,
    totalMessages: (actionLogs as any[]).length + (modLogs as any[]).length,
    moderationActions,
    ticketsOpen,
    activity,
    topUsers
  });
}