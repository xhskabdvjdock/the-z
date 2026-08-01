import { Collection } from "../db/collection";

export interface ILevelUser {
  _id?: string;
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  totalXp: number;
  lastMessageAt?: Date;
  voiceMinutes: number;
}

export const LevelUser = new Collection<ILevelUser>("level_users", "guildId", () => ({
  xp: 0,
  level: 0,
  totalXp: 0,
  voiceMinutes: 0
}));
