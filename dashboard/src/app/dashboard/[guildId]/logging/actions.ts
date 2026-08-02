"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveLoggingConfig(guildId: string, data: IGuildConfig["logging"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving logging config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("customChannels type:", typeof data.customChannels);
    console.log("customChannels.messages:", data.customChannels?.messages);
    console.log("customChannels.messages type:", Array.isArray(data.customChannels?.messages));

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { logging: data } }, { upsert: true });

    console.log("Logging config saved successfully");

    revalidatePath(`/dashboard/${guildId}/logging`);
  } catch (error) {
    console.error("Error saving logging config:", error);
    throw error;
  }
}
