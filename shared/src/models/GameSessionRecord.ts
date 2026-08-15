import { Collection } from "../db/collection";

/**
 * سجل جلسة لعبة نشطة — يُكتب عند فتح الـ Lobby ويُحذف عند انتهاء الجلسة.
 * الغرض منه: استعادة الحالة بعد إعادة تشغيل البوت (إلغاء الجلسات المعلّقة
 * بدل تركها عالقة في رومات السيرفرات).
 */
export interface IGameSessionRecord {
  sessionId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  gameName: string;
  hostId: string;
  /** حالة الجلسة وقت الكتابة (lobby/playing/...) */
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function defaultGameSessionRecord(sessionId: string): IGameSessionRecord {
  const now = new Date();
  return {
    sessionId,
    guildId: "",
    channelId: "",
    messageId: "",
    gameName: "",
    hostId: "",
    status: "LOBBY",
    createdAt: now,
    updatedAt: now
  };
}

export const GameSessionRecord = new Collection<IGameSessionRecord>(
  "game_session_records",
  "sessionId",
  () => defaultGameSessionRecord("")
);