"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ResolvedStarboardSettings } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveStarboardConfig(guildId: string, data: ResolvedStarboardSettings) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    const clean: ResolvedStarboardSettings = {
      enabled: !!data.enabled,
      channelId: data.channelId || null,
      threshold: Math.max(1, Math.floor(Number(data.threshold) || 3)),
      emoji: String(data.emoji || "⭐").slice(0, 16),
      ignoredChannelIds: Array.isArray(data.ignoredChannelIds) ? data.ignoredChannelIds.slice(0, 100) : [],
      ignoredRoleIds: Array.isArray(data.ignoredRoleIds) ? data.ignoredRoleIds.slice(0, 100) : [],
      ignoredUserIds: Array.isArray(data.ignoredUserIds) ? data.ignoredUserIds.slice(0, 100) : [],
      removeOnBelowThreshold: data.removeOnBelowThreshold !== false,
      minAccountAgeDays: Math.max(0, Math.floor(Number(data.minAccountAgeDays) || 0))
    };

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { starboard: clean } },
      { upsert: true }
    );

    logAction({
      label: "starboard/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات لوحة النجوم",
      details: summarizeConfig(clean as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/starboard`);
  } catch (error) {
    logError("starboard/save", error);
    throw error;
  }
}
