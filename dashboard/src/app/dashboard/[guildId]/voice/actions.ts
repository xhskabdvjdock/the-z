"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveVoiceConfig(guildId: string, data: IGuildConfig["tempVoice"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { tempVoice: data } },
      { upsert: true }
    );

    logAction({
      label: "voice/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الرومات الصوتية المؤقتة",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/voice`);
  } catch (error) {
    logError("voice/save", error);
    throw error;
  }
}

export async function saveAlwaysVoiceConfig(guildId: string, data: IGuildConfig["alwaysVoice"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { alwaysVoice: data } },
      { upsert: true }
    );

    logAction({
      label: "voice/always-save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الرومات الصوتية الدائمة",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/voice`);
  } catch (error) {
    logError("voice/always-save", error);
    throw error;
  }
}
