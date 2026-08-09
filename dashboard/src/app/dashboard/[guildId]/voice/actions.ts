"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function saveVoiceConfig(guildId: string, data: IGuildConfig["tempVoice"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tempVoice: data } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/voice`);
  } catch (error) {
    logError("voice/save", error);
    throw error;
  }
}
