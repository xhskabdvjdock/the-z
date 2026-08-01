"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export type LevelingInput = IGuildConfig["leveling"];

export async function saveLevelingConfig(guildId: string, data: LevelingInput) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { leveling: data } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/leveling`);
}
