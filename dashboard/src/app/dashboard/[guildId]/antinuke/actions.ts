"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveAntiNukeConfig(guildId: string, data: IGuildConfig["antiNuke"]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate({ guildId }, { $set: { antiNuke: data } }, { upsert: true });

  revalidatePath(`/dashboard/${guildId}/antinuke`);
}
