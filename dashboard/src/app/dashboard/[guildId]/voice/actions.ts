"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveVoiceConfig(guildId: string, data: IGuildConfig["tempVoice"]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { tempVoice: data } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/voice`);
}
