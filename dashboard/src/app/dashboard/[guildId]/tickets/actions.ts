"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveTicketsConfig(guildId: string, data: IGuildConfig["tickets"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving tickets config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tickets: data } },
      { upsert: true }
    );

    console.log("Save completed successfully");

    revalidatePath(`/dashboard/${guildId}/tickets`);
  } catch (error) {
    console.error("Error saving tickets config:", error);
    throw error;
  }
}
