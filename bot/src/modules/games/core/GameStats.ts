import { Collection } from "@thez/shared";

export interface GameStats {
  userId: string;
  guildId: string;
  gameId: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  bestScore: number;
  score: number;
}

export const GameStats = new Collection<GameStats>("game_stats", "userId", () => ({
  userId: "",
  guildId: "",
  gameId: "",
  wins: 0,
  losses: 0,
  draws: 0,
  gamesPlayed: 0,
  bestScore: 0,
  score: 0
}));

export async function recordGameResult(guildId: string, gameId: string, winners: string[], players: string[], scores?: Record<string, number>) {
  for (const playerId of players) {
    const isWinner = winners.includes(playerId);
    const score = scores?.[playerId] ?? (isWinner ? 1 : 0);
    const existing = await GameStats.findOne({ userId: playerId, guildId, gameId });
    if (existing) {
      await GameStats.findOneAndUpdate(
        { userId: playerId, guildId, gameId },
        {
          $set: {
            wins: existing.wins + (isWinner ? 1 : 0),
            losses: existing.losses + (isWinner ? 0 : 1),
            gamesPlayed: existing.gamesPlayed + 1,
            bestScore: Math.max(existing.bestScore, score),
            score: existing.score + score
          }
        }
      );
    } else {
      await GameStats.create({
        userId: playerId,
        guildId,
        gameId,
        wins: isWinner ? 1 : 0,
        losses: isWinner ? 0 : 1,
        draws: 0,
        gamesPlayed: 1,
        bestScore: score,
        score
      });
    }
  }
}

export async function getLeaderboard(guildId: string, gameId?: string, limit = 10) {
  const filter: any = { guildId };
  if (gameId) filter.gameId = gameId;
  const all = await GameStats.find(filter).lean();
  return (all as any[]).sort((a: any, b: any) => b.wins - a.wins || b.score - a.score).slice(0, limit);
}