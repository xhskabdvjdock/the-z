"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveTicketsConfig(guildId: string, data: IGuildConfig["tickets"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("=== Saving tickets config ===");
    console.log("Guild ID:", guildId);
    console.log("Full data to save:", JSON.stringify(data, null, 2));

    const result = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tickets: data } },
      { upsert: true }
    );

    console.log("MongoDB result:", result);
    console.log("Save completed successfully");

    revalidatePath(`/dashboard/${guildId}/tickets`);
  } catch (error) {
    console.error("=== Error saving tickets config ===");
    console.error("Error:", error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
