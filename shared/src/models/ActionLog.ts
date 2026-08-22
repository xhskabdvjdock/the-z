import { Collection } from "../db/collection";

/** سجل إجراءات لوحة التحكم — يُسجَّل من server actions ويرتب زمنيًا تنازليًا */
export interface IActionLog {
  _id?: string;
  guildId: string;
  /** معرّف مستخدم الداشبورد الذي نفّذ الإجراء */
  userId: string;
  userName?: string;
  label: string;
  /** وصف الإجراء */
  action: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

export const ActionLog = new Collection<IActionLog>("action_logs", "guildId", () => ({
  createdAt: new Date()
}));