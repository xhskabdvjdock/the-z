import { Collection } from "../db/collection";

/** رسالة منشورة في Starboard — تُحفظ الرسائل المنشورة فقط، لا كل reaction */
export interface IStarboardEntry {
  /** `${guildId}:${messageId}` — مفتاح الفهرس */
  key: string;
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  starboardChannelId: string;
  starboardMessageId: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export const StarboardEntry = new Collection<IStarboardEntry>("starboard_entries", "key", () => ({
  key: "",
  guildId: "",
  channelId: "",
  messageId: "",
  authorId: "",
  starboardChannelId: "",
  starboardMessageId: "",
  count: 0,
  createdAt: new Date(),
  updatedAt: new Date()
}));
