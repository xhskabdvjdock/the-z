"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveAutoResponses(guildId: string, data: IGuildConfig["autoResponses"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoResponses: data } },
      { upsert: true }
    );

    logAction({
      label: "autoresponse/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ الردود التلقائية",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/autoresponse`);
  } catch (error) {
    logError("autoresponse/save", error);
    throw error;
  }
}
