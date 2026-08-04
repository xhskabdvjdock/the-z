"use server";

import { requireGuildAdmin } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { revalidatePath } from "next/cache";

export async function saveJailConfig(guildId: string, data: {
  enabled: boolean;
  roleId: string;
  removeRoles: string[];
  allowAdminBypass: boolean;
}) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { jail: data } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/jail`);
  } catch (error) {
    console.error("Error saving jail config:", error);
    throw error;
  }
}
