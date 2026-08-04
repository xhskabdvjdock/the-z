import { Collection } from "../db/collection";

export interface IAfkUser {
  _id?: string;
  guildId: string;
  userId: string;
  status: boolean;
  reason?: string;
  mentionCount: number;
  since: Date;
}

export const AfkUser = new Collection<IAfkUser>("afk_users", "guildId", () => ({
  status: false,
  mentionCount: 0,
  since: new Date()
}));
