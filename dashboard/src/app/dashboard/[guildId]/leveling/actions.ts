"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export type LevelingInput = IGuildConfig["leveling"];

export async function saveLevelingConfig(guildId: string, data: LevelingInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving leveling config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { leveling: data } },
      { upsert: true }
    );

    console.log("Leveling config saved successfully");

    revalidatePath(`/dashboard/${guildId}/leveling`);
  } catch (error) {
    console.error("Error saving leveling config:", error);
    throw error;
  }
}
