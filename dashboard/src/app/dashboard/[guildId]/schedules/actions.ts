"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IScheduledMessage } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";

export async function saveScheduledMessages(guildId: string, data: IScheduledMessage[]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { scheduledMessages: data } },
      { upsert: true }
    );

    logAction({
      label: "schedules/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ الرسائل المجدولة",
      details: { count: data.length }
    });

    revalidatePath(`/dashboard/${guildId}/schedules`);
  } catch (error) {
    logError("schedules/save", error);
    throw error;
  }
}