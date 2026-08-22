"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export type LevelingInput = IGuildConfig["leveling"];

export async function saveLevelingConfig(guildId: string, data: LevelingInput) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { leveling: data } },
      { upsert: true }
    );

    logAction({
      label: "leveling/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات المستويات (Leveling)",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/leveling`);
  } catch (error) {
    logError("leveling/save", error);
    throw error;
  }
}
