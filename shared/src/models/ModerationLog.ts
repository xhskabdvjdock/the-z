import { Collection } from "../db/collection";

/** سجل إجراءات الإشراف — يُكتب من أوامر البوت ويُعرض في لوحة التحكم (Audit) */
export interface IModerationLog {
  _id?: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  /** ban | kick | mute | unmute | warn | unban | clear | lock | unlock | slowmode | jail | unjail | auto */
  action: string;
  reason?: string;
  durationMinutes?: number;
  createdAt: Date;
}

export const ModerationLog = new Collection<IModerationLog>("moderation_logs", "guildId", () => ({
  moderatorId: "",
  createdAt: new Date()
}));