"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function saveAntiNukeConfig(guildId: string, data: IGuildConfig["antiNuke"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { antiNuke: data } }, { upsert: true });

    revalidatePath(`/dashboard/${guildId}/antinuke`);
  } catch (error) {
    logError("antinuke/save", error);
    throw error;
  }
}
