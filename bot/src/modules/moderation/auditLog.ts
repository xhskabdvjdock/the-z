import { ModerationLog } from "@thez/shared";
import { logError } from "../../utils/logger";
import { trackModeration } from "../analytics/analytics";

/** معاملات سجل الإشراف */
export interface AuditEntry {
  guildId: string;
  userId: string;
  moderatorId: string;
  action: string;
  reason?: string;
  durationMinutes?: number;
}

/**
 * يكتب إدخالاً في سجل الإشراف — الفشل لا يكسر تنفيذ الأمر أبداً
 * (السجل ملحق اختياري على مسار الإجراء نفسه).
 */
export async function recordModerationLog(entry: AuditEntry): Promise<void> {
  try {
    trackModeration(entry.guildId, entry.action);
    await ModerationLog.create({
      ...entry,
      createdAt: new Date()
    });
  } catch (err) {
    logError("moderation-audit", err);
  }
}