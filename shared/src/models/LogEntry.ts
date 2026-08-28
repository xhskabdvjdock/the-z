import { Collection } from "../db/collection";

export interface ILogEntry {
  _id?: string;
  guildId: string;
  type: "moderation" | "members" | "messages" | "voice" | "actions" | "files" | "server" | "roles" | "channels" | "other" | "invites" | "suggestions" | "access" | "leveling" | "jail" | "reactionroles";
  action: string;
  // من قام بالإجراء
  executorId?: string;
  executorTag?: string;
  // من تأثر بالإجراء
  targetId?: string;
  targetTag?: string;
  // تفاصيل الإجراء
  reason?: string;
  duration?: string;
  channelId?: string;
  channelName?: string;
  roleId?: string;
  roleName?: string;
  messageId?: string;
  messageUrl?: string;
  // حالة قبل وبعد
  before?: any;
  after?: any;
  // تفاصيل إضافية
  details?: any;
  createdAt: Date;
}

export const LogEntry = new Collection<ILogEntry>("log_entries", "guildId", () => ({
  createdAt: new Date()
}));