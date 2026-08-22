"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveMemberCounterConfig(guildId: string, data: IGuildConfig["memberCounter"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { memberCounter: data } },
      { upsert: true }
    );

    logAction({
      label: "member-counter/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات عداد الأعضاء",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/member-counter`);
  } catch (error) {
    logError("member-counter/save", error);
    throw error;
  }
}