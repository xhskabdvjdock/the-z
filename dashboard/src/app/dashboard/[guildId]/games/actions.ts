"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGameOverride } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveGamesSettings(
  guildId: string,
  settings: { enabled: boolean; overrides: IGameOverride[] }
) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { games: settings } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/games`);
}