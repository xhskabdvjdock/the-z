"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveVoiceConfig(guildId: string, data: IGuildConfig["tempVoice"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving voice config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tempVoice: data } },
      { upsert: true }
    );

    console.log("Voice config saved successfully");

    revalidatePath(`/dashboard/${guildId}/voice`);
  } catch (error) {
    console.error("Error saving voice config:", error);
    throw error;
  }
}
