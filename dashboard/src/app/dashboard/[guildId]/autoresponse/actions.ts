"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveAutoResponses(guildId: string, data: IGuildConfig["autoResponses"]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { autoResponses: data } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/autoresponse`);
}
