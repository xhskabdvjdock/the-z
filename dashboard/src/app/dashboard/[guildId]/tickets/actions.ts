"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveTicketsConfig(guildId: string, data: IGuildConfig["tickets"]) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tickets: data } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/tickets`);
  } catch (error) {
    throw error;
  }
}
