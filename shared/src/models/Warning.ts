import { Collection } from "../db/collection";

export interface IWarning {
  _id?: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: Date;
}

export const Warning = new Collection<IWarning>("warnings", "guildId", () => ({
  reason: "لا يوجد سبب",
  createdAt: new Date()
}));
