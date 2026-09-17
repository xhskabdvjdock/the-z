"use server";

import { revalidatePath } from "next/cache";
import { Notification } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function markAllNotificationsRead(guildId: string) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();
    const list = await Notification.find({ guildId, read: false });
    for (const n of list) {
      (n as any).read = true;
      await (n as any).save().catch(() => null);
    }
    revalidatePath(`/dashboard/${guildId}/notifications`);
  } catch (error) {
    logError("notifications/read", error);
    throw error;
  }
}
