"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveReactionRolesConfig(guildId: string, data: IGuildConfig["reactionRoles"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { reactionRoles: data } },
      { upsert: true }
    );

    logAction({
      label: "reaction-roles/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات رولات الرياكشن",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/reaction-roles`);
  } catch (error) {
    logError("reaction-roles/save", error);
    throw error;
  }
}