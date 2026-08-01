"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export type AutomodInput = IGuildConfig["automod"];

export async function saveAutomodConfig(guildId: string, data: AutomodInput) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { automod: data } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/automod`);
}
