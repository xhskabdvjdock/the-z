"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export interface RolesConfigInput {
  autoRole: IGuildConfig["autoRole"];
  colors: IGuildConfig["colors"];
  selfRoles: IGuildConfig["selfRoles"];
}

export async function saveRolesConfig(guildId: string, data: RolesConfigInput) {
  try {
    await requireGuildAdmin(guildId);
    await ensureDb();

    console.log("Saving roles config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoRole: data.autoRole, colors: data.colors, selfRoles: data.selfRoles } },
      { upsert: true }
    );

    console.log("Roles config saved successfully");

    revalidatePath(`/dashboard/${guildId}/roles`);
  } catch (error) {
    console.error("Error saving roles config:", error);
    throw error;
  }
}
