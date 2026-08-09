"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export type LevelingInput = IGuildConfig["leveling"];

export async function saveLevelingConfig(guildId: string, data: LevelingInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { leveling: data } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/leveling`);
  } catch (error) {
    logError("leveling/save", error);
    throw error;
  }
}
