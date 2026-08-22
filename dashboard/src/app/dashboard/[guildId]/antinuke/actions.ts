"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveAntiNukeConfig(guildId: string, data: IGuildConfig["antiNuke"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { antiNuke: data } }, { upsert: true });

    logAction({
      label: "antinuke/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الحماية (Anti-Nuke)",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/antinuke`);
  } catch (error) {
    logError("antinuke/save", error);
    throw error;
  }
}
