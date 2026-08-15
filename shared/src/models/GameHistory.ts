import { Collection } from "../db/collection";

/** سجل مشارك في مباراة معينة (لصفحة سجل المباريات) */
export interface IGameHistoryPlayer {
  id: string;
  tag: string;
  avatarURL?: string;
  result: "win" | "lose" | "draw";
  score: number;
}

/** سجل مباراة كاملة — يُحفظ بعد كل مباراة تنتهي (لا تُحفظ المباريات الملغاة) */
export interface IGameHistory {
  guildId: string;
  gameName: string;
  /** سيرفر اللعبة إذا كانت Cross-Guild (المضيف) */
  crossGuild?: boolean;
  players: IGameHistoryPlayer[];
  winners: string[];
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  createdAt: Date;
}

export function defaultGameHistory(guildId: string): IGameHistory {
  const now = new Date();
  return {
    guildId,
    gameName: "",
    players: [],
    winners: [],
    startedAt: now,
    endedAt: now,
    durationMs: 0,
    createdAt: now
  };
}

export const GameHistory = new Collection<IGameHistory>("game_history", "guildId", () =>
  defaultGameHistory("")
);