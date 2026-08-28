import { Collection } from "../db/collection";

export interface INotification {
  id: string;
  guildId: string;
  type: "suggestion" | "moderation" | "ticket" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const Notification = new Collection<INotification>("notifications", "guildId", () => ({
  id: "",
  guildId: "",
  type: "system",
  title: "",
  message: "",
  read: false,
  createdAt: new Date().toISOString()
}));

export async function createNotification(guildId: string, type: INotification["type"], title: string, message: string) {
  return Notification.create({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    guildId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  });
}