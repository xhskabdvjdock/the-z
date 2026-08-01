"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveAntiNukeConfig(guildId: string, data: IGuildConfig["antiNuke"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving antinuke config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { antiNuke: data } }, { upsert: true });

    console.log("Antinuke config saved successfully");

    revalidatePath(`/dashboard/${guildId}/antinuke`);
  } catch (error) {
    console.error("Error saving antinuke config:", error);
    throw error;
  }
}
