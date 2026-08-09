"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function saveAutoResponses(guildId: string, data: IGuildConfig["autoResponses"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoResponses: data } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/autoresponse`);
  } catch (error) {
    logError("autoresponse/save", error);
    throw error;
  }
}
