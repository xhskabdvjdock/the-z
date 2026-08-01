"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveCaptchaConfig(guildId: string, data: IGuildConfig["captcha"]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate({ guildId }, { $set: { captcha: data } }, { upsert: true });

  revalidatePath(`/dashboard/${guildId}/captcha`);
}
