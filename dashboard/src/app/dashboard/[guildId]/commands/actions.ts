"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICommandOverride } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveCommandOverrides(guildId: string, overrides: ICommandOverride[]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving command overrides for guild:", guildId);
    console.log("Data:", JSON.stringify(overrides, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { commandOverrides: overrides } },
      { upsert: true }
    );

    console.log("Command overrides saved successfully");

    revalidatePath(`/dashboard/${guildId}/commands`);
  } catch (error) {
    console.error("Error saving command overrides:", error);
    throw error;
  }
}
