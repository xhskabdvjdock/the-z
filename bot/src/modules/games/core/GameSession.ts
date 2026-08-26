import { randomUUID } from "crypto";

export interface GamePlayer {
  id: string;
  username: string;
  score: number;
  alive: boolean;
}

export interface GameSession {
  sessionId: string;
  gameId: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  hostId: string;
  players: GamePlayer[];
  spectators: string[];
  state: "waiting" | "starting" | "playing" | "finished";
  settings: Record<string, any>;
  createdAt: number;
  startedAt?: number;
  expiresAt: number;
  data: Record<string, any>;
}

export function createSession(gameId: string, guildId: string, channelId: string, hostId: string, hostUsername: string): GameSession {
  return {
    sessionId: randomUUID(),
    gameId,
    guildId,
    channelId,
    hostId,
    players: [{ id: hostId, username: hostUsername, score: 0, alive: true }],
    spectators: [],
    state: "waiting",
    settings: {},
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000,
    data: {}
  };
}