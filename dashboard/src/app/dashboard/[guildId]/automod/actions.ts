"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export type AutomodInput = IGuildConfig["automod"] & { autoDeleteConfirmation?: number; punishments?: any };

export async function saveAutomodConfig(guildId: string, data: AutomodInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving automod config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    const { autoDeleteConfirmation, punishments, ...automodData } = data;

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { 
        $set: { 
          automod: { ...automodData, punishments },
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
