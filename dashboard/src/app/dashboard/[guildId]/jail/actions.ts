"use server";

import { requireGuildAdmin } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { revalidatePath } from "next/cache";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveJailConfig(guildId: string, data: {
  enabled: boolean;
  roleId: string;
  removeRoles: string[];
  allowAdminBypass: boolean;
}) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { jail: data } },
      { upsert: true }
    );

    logAction({
      label: "jail/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الجايل",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/jail`);
  } catch (error) {
    logError("jail/save", error);
    throw error;
  }
}
