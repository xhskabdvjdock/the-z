"use server";

import { revalidatePath } from "next/cache";
import { Notification } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function markAllNotificationsRead(guildId: string) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();
    // تحديث جماعي واحد بدل حفظ كل إشعار على حدة
    await Notification.updateMany({ guildId, read: false }, { $set: { read: true } });
    revalidatePath(`/dashboard/${guildId}/notifications`);
  } catch (error) {
    logError("notifications/read", error);
    throw error;
  }
}
