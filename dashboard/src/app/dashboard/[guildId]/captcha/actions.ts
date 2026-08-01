"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveCaptchaConfig(guildId: string, data: IGuildConfig["captcha"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving captcha config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { captcha: data } }, { upsert: true });

    console.log("Captcha config saved successfully");

    revalidatePath(`/dashboard/${guildId}/captcha`);
  } catch (error) {
    console.error("Error saving captcha config:", error);
    throw error;
  }
}
