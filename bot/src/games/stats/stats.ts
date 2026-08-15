import { GameHistory, GameStats, IGameStats } from "@thez/shared";
import { GameSession } from "../core/types";
import { GameResult } from "../core/types";

/** مفتاح أسبوع ISO (مثال "2026-W33") */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** مفتاح شهر (مثال "2026-08") */
export function monthKey(date: Date = new Date()): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface PlayerOutcome {
  id: string;
  tag: string;
  avatarURL?: string;
  result: "win" | "lose" | "draw";
  score: number;
  points: number;
}

/**
 * تسجيل نتيجة مباراة: تحديث GameStats لكل مشارك + إضافة سجل GameHistory.
 * النقاط الموسمية: فوز 3 / تعادل 1 / خسارة 0 (للألعاب الجماعية)،
 * وللألعاب الفردية الناجحة نقطتان. pointsOverride يغيّر ذلك.
 */
export async function recordGameResult(
  session: GameSession,
  result: GameResult
): Promise<void> {
  const now = new Date();
  const wk = weekKey(now);
  const mk = monthKey(now);
  const isMultiplayer = session.def.category === "multiplayer";

  const winnerSet = new Set(result.winners);
  const draw = result.draw === true;

  const outcomes: PlayerOutcome[] = session.players.map((p) => {
    const isWin = !draw && winnerSet.has(p.id);
    const isDraw = draw;
    const score = result.scores[p.id] ?? p.score ?? 0;
    let points: number;
    if (result.pointsOverride && result.pointsOverride[p.id] != null) {
      points = result.pointsOverride[p.id];
    } else if (isWin) {
      points = isMultiplayer ? 3 : 2;
    } else if (isDraw) {
      points = 1;
    } else {
      points = 0;
    }
    return {
      id: p.id,
      tag: p.tag,
      avatarURL: p.avatarURL || undefined,
      result: isDraw ? "draw" : isWin ? "win" : "lose",
      score,
      points
    };
  });

  // تحديث إحصاءات كل مشارك (قراءة ثم كتابة — تزامن منخفض)
  await Promise.all(
    outcomes.map(async (o) => {
      const key = `${session.guildId}:${o.id}:${session.def.name}`;
      const existing = await GameStats.findOne({ key });
      const base = existing ?? {
        key,
        guildId: session.guildId,
        userId: o.id,
        gameName: session.def.name,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        points: 0,
        score: 0,
        bestScore: 0,
        currentStreak: 0,
        maxStreak: 0,
        weekKey: wk,
        weekPoints: 0,
        monthKey: mk,
        monthPoints: 0,
        createdAt: now,
        updatedAt: now
      };

      const wins = base.wins + (o.result === "win" ? 1 : 0);
      const losses = base.losses + (o.result === "lose" ? 1 : 0);
      const draws = base.draws + (o.result === "draw" ? 1 : 0);
      const currentStreak =
        o.result === "win" ? base.currentStreak + 1 : o.result === "lose" ? 0 : base.currentStreak;
      const weekPoints = base.weekKey === wk ? base.weekPoints + o.points : o.points;
      const monthPoints = base.monthKey === mk ? base.monthPoints + o.points : o.points;

      const data = {
        ...base,
        wins,
        losses,
        draws,
        gamesPlayed: base.gamesPlayed + 1,
        points: base.points + o.points,
        score: base.score + o.score,
        bestScore: Math.max(base.bestScore, o.score),
        currentStreak,
        maxStreak: Math.max(base.maxStreak, currentStreak),
        weekKey: wk,
        weekPoints,
        monthKey: mk,
        monthPoints,
        lastPlayedAt: now,
        updatedAt: now
      };

      if (existing) {
        await GameStats.updateOne({ key }, { $set: data });
      } else {
        await GameStats.create(data);
      }
    })
  );

  // سجل المباراة
  try {
    await GameHistory.create({
      guildId: session.guildId,
      gameName: session.def.name,
      crossGuild: session.crossGuild != null,
      players: outcomes.map((o) => ({
        id: o.id,
        tag: o.tag,
        avatarURL: o.avatarURL,
        result: o.result,
        score: o.score
      })),
      winners: draw ? [] : result.winners,
      startedAt: new Date(session.startedAt),
      endedAt: now,
      durationMs: now.getTime() - session.startedAt
    });
  } catch {
    /* سجل المباراة اختياري — لا يُسقط تسجيل النتيجة */
  }
}

/** إحصاءات لاعب في لعبة محددة */
export async function getPlayerGameStats(
  guildId: string,
  userId: string,
  gameName: string
): Promise<IGameStats | null> {
  return GameStats.findOne({ key: `${guildId}:${userId}:${gameName}` });
}

/** إحصاءات لاعب عبر كل الألعاب في سيرفر (تجميع) */
export async function getPlayerAllStats(
  guildId: string,
  userId: string
): Promise<(IGameStats & { games: string[] }) | null> {
  const rows = await GameStats.find({ guildId, userId });
  if (!rows.length) return null;
  const out: IGameStats & { games: string[] } = {
    key: `${guildId}:${userId}:all`,
    guildId,
    userId,
    gameName: "all",
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    points: 0,
    score: 0,
    bestScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    weekKey: "",
    weekPoints: 0,
    monthKey: "",
    monthPoints: 0,
    lastPlayedAt: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    games: []
  };
  for (const r of rows) {
    out.gamesPlayed += r.gamesPlayed;
    out.wins += r.wins;
    out.losses += r.losses;
    out.draws += r.draws;
    out.points += r.points;
    out.score += r.score;
    out.bestScore = Math.max(out.bestScore, r.bestScore);
    out.maxStreak = Math.max(out.maxStreak, r.maxStreak);
    if (r.lastPlayedAt > out.lastPlayedAt) out.lastPlayedAt = r.lastPlayedAt;
    out.games.push(r.gameName);
  }
  return out;
}