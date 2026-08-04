"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export type AutomodInput = Omit<IGuildConfig["automod"], "punishments" | "timeoutDurations"> & { 
  autoDeleteConfirmation?: number; 
  punishments?: any; 
  timeoutDurations?: any 
};

export async function saveAutomodConfig(guildId: string, data: AutomodInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving automod config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    const { autoDeleteConfirmation, punishments, timeoutDurations, ...automodData } = data;

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { 
        $set: { 
          automod: { ...automodData, punishments, timeoutDurations },
          "moderation.autoDeleteConfirmation": autoDeleteConfirmation ?? 0
        } 
      },
      { upsert: true }
    );

    console.log("Automod config saved successfully");

    revalidatePath(`/dashboard/${guildId}/automod`);
  } catch (error) {
    console.error("Error saving automod config:", error);
    throw error;
  }
}
