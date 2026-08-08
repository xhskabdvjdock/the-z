"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICommandOverride } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveCommandOverrides(guildId: string, overrides: ICommandOverride[]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { commandOverrides: overrides } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/commands`);
}

export async function saveModerationSettings(
  guildId: string,
  settings: { autoDeleteConfirmation: number }
) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { "moderation.autoDeleteConfirmation": settings.autoDeleteConfirmation } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/commands`);
}
