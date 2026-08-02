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

    // تحويل strings إلى arrays للحقول القديمة
    const processedData = {
      ...data,
      customChannels: {
        media: Array.isArray(data.customChannels?.media) ? data.customChannels.media : (data.customChannels?.media ? [data.customChannels.media] : []),
        stickers: Array.isArray(data.customChannels?.stickers) ? data.customChannels.stickers : (data.customChannels?.stickers ? [data.customChannels.stickers] : [])
      }
    };

    console.log("Processed data:", JSON.stringify(processedData, null, 2));

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { logging: processedData } }, { upsert: true });

    console.log("Logging config saved successfully");

    revalidatePath(`/dashboard/${guildId}/logging`);
  } catch (error) {
    console.error("Error saving logging config:", error);
    throw error;
  }
}
