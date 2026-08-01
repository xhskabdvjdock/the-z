"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveAutoResponses(guildId: string, data: IGuildConfig["autoResponses"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving autoresponses for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoResponses: data } },
      { upsert: true }
    );

    console.log("Autoresponses saved successfully");

    revalidatePath(`/dashboard/${guildId}/autoresponse`);
  } catch (error) {
    console.error("Error saving autoresponses:", error);
    throw error;
  }
}
