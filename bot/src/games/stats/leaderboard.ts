import { GameStats, IGameStats } from "@thez/shared";
import { weekKey, monthKey } from "./stats";

export type LeaderboardScope = "global" | "server" | "weekly" | "monthly";
export type LeaderboardMetric = "wins" | "points" | "score";

export interface LeaderboardEntry {
  rank: number;
  guildId: string;
  userId: string;
  gameName: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  points: number;
  score: number;
  bestScore: number;
  currentStreak: number;
  metricValue: number;
}

export interface LeaderboardOptions {
  /** gameName محدد أو كل الألعاب */
  gameName?: string;
  /** سيرفر محدد */
  guildId?: string;
  scope?: LeaderboardScope;
  metric?: LeaderboardMetric;
  limit?: number;
}

/**
 * لائحة المتصدرين في The Z Games.
 * global: كل السيرفرات | server: سيرفر محدد | weekly/monthly: نقاط الأسبوع/الشهر الحاليين.
 */
export async function getLeaderboard(opts: LeaderboardOptions): Promise<LeaderboardEntry[]> {
  const { gameName, guildId, scope = "global", metric = "points", limit = 10 } = opts;

  const filter: Record<string, any> = {};
  if (guildId) filter.guildId = guildId;
  if (gameName) filter.gameName = gameName;

  let rows = await GameStats.find(filter);

  // نطاق أسبوعي/شهري: نقاط الفترة الحالية فقط
  if (scope === "weekly") {
    const wk = weekKey();
    rows = rows.filter((r) => r.weekKey === wk && r.weekPoints > 0);
  } else if (scope === "monthly") {
    const mk = monthKey();
    rows = rows.filter((r) => r.monthKey === mk && r.monthPoints > 0);
  }

  const pick = (r: IGameStats): number => {
    if (scope === "weekly") return r.weekPoints;
    if (scope === "monthly") return r.monthPoints;
    return r[metric];
  };

  const sorted = [...rows].sort((a, b) => {
    const diff = pick(b) - pick(a);
    if (diff !== 0) return diff;
    return b.wins - a.wins || b.score - a.score;
  });

  return sorted.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    guildId: r.guildId,
    userId: r.userId,
    gameName: r.gameName,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    gamesPlayed: r.gamesPlayed,
    points: r.points,
    score: r.score,
    bestScore: r.bestScore,
    currentStreak: r.currentStreak,
    metricValue: pick(r)
  }));
}

/** ترتيب لاعب محدد داخل لائحة (يُستخدم لبطاقة "مرتبتي") */
export async function getPlayerRank(opts: LeaderboardOptions & { userId: string }): Promise<{
  rank: number;
  total: number;
  entry: LeaderboardEntry | null;
}> {
  const { userId, limit = 10 } = opts;
  const filter: Record<string, any> = {};
  if (opts.guildId) filter.guildId = opts.guildId;
  if (opts.gameName) filter.gameName = opts.gameName;

  let rows = await GameStats.find(filter);
  const scope = opts.scope ?? "global";
  if (scope === "weekly") {
    const wk = weekKey();
    rows = rows.filter((r) => r.weekKey === wk && r.weekPoints > 0);
  } else if (scope === "monthly") {
    const mk = monthKey();
    rows = rows.filter((r) => r.monthKey === mk && r.monthPoints > 0);
  }

  const metric = opts.metric ?? "points";
  const pick = (r: IGameStats): number => {
    if (scope === "weekly") return r.weekPoints;
    if (scope === "monthly") return r.monthPoints;
    return r[metric];
  };

  const sorted = [...rows].sort((a, b) => {
    const diff = pick(b) - pick(a);
    if (diff !== 0) return diff;
    return b.wins - a.wins || b.score - a.score;
  });

  const idx = sorted.findIndex((r) => r.userId === userId);
  const entry = idx === -1 ? null : sorted[idx];

  return {
    rank: idx === -1 ? 0 : idx + 1,
    total: sorted.length,
    entry: entry
      ? {
          rank: idx + 1,
          guildId: entry.guildId,
          userId: entry.userId,
          gameName: entry.gameName,
          wins: entry.wins,
          losses: entry.losses,
          draws: entry.draws,
          gamesPlayed: entry.gamesPlayed,
          points: entry.points,
          score: entry.score,
          bestScore: entry.bestScore,
          currentStreak: entry.currentStreak,
          metricValue: pick(entry)
        }
      : null
  };
}