"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveLoggingConfig(guildId: string, data: IGuildConfig["logging"]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate({ guildId }, { $set: { logging: data } }, { upsert: true });

  revalidatePath(`/dashboard/${guildId}/logging`);
}
