"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export async function saveCaptchaConfig(guildId: string, data: IGuildConfig["captcha"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { captcha: data } }, { upsert: true });

    revalidatePath(`/dashboard/${guildId}/captcha`);
  } catch (error) {
    logError("captcha/save", error);
    throw error;
  }
}
