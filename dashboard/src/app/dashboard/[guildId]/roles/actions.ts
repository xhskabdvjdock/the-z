"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

export interface RolesConfigInput {
  autoRole: IGuildConfig["autoRole"];
  colors: IGuildConfig["colors"];
  selfRoles: IGuildConfig["selfRoles"];
}

export async function saveRolesConfig(guildId: string, data: RolesConfigInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoRole: data.autoRole, colors: data.colors, selfRoles: data.selfRoles } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/roles`);
  } catch (error) {
    logError("roles/save", error);
    throw error;
  }
}
