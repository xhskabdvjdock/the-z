"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";

export async function saveGamesConfig(guildId: string, data: { enabled: boolean; games: Record<string, { enabled: boolean; command: string }> }) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    // تنظيف الأوامر
    const cleaned: Record<string, { enabled: boolean; command: string }> = {};
    for (const [id, cfg] of Object.entries(data.games)) {
      const cmd = cfg.command.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || id;
      cleaned[id] = { enabled: Boolean(cfg.enabled), command: cmd };
    }

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { games: { enabled: data.enabled, games: cleaned } } },
      { upsert: true }
    );

    logAction({
      label: "games/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الألعاب",
      details: { enabled: data.enabled, count: Object.keys(cleaned).length } as any
    });

    revalidatePath(`/dashboard/${guildId}/games`);
  } catch (error) {
    logError("games/save", error);
    throw error;
  }
}