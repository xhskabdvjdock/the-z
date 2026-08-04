import { Collection } from "../db/collection";

export interface IJailUser {
  _id?: string;
  userId: string;
  guildId: string;
  originalRoles: string[];
  jailedBy: string;
  jailedAt: Date;
}

export const JailUser = new Collection<IJailUser>("jail_users", "guildId", () => ({
  originalRoles: [],
  jailedBy: "",
  jailedAt: new Date()
}));
