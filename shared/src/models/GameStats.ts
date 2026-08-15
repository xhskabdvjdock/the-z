import { Collection } from "../db/collection";

/**
 * إحصاءات اللاعب في لعبة معينة داخل سيرفر معين.
 * `key` = `guildId:userId:gameName` (مفتاح فريد للنموذج).
 * النقاط منفصلة عن الـ Score: النقاط = موسمية تُمنح للفوز/التعادل،
 * والـ Score = تراكم أداء اللاعب داخل اللعبة نفسها.
 */
export interface IGameStats {
  key: string;
  guildId: string;
  userId: string;
  gameName: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  /** نقاط موسمية (فوز = 3، تعادل = 1، خسارة = 0 للألعاب الجماعية) */
  points: number;
  /** مجموع النقاط المُحصّلة داخل اللعبة (نتائج الجولات) */
  score: number;
  bestScore: number;
  currentStreak: number;
  maxStreak: number;
  /** مفتاح الأسبوع الحالي (مثال "2026-W33") — عند تغيّره تُصفَّر weekPoints */
  weekKey: string;
  weekPoints: number;
  /** مفتاح الشهر الحالي (مثال "2026-08") — عند تغيّره تُصفَّر monthPoints */
  monthKey: string;
  monthPoints: number;
  lastPlayedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function defaultGameStats(
  key: string,
  guildId: string,
  userId: string,
  gameName: string
): IGameStats {
  const now = new Date();
  return {
    key,
    guildId,
    userId,
    gameName,
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
    lastPlayedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

export const GameStats = new Collection<IGameStats>("game_stats", "key", () =>
  defaultGameStats("", "", "", "")
);