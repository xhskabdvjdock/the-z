"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveLoggingConfig(guildId: string, data: IGuildConfig["logging"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    // تحويل strings إلى arrays للحقول القديمة
    const processedData = {
      ...data,
      customChannels: {
        messages: Array.isArray(data.customChannels?.messages) ? data.customChannels.messages : [],
        commands: Array.isArray(data.customChannels?.commands) ? data.customChannels.commands : (data.customChannels?.commands ? [data.customChannels.commands] : []),
        media: Array.isArray(data.customChannels?.media) ? data.customChannels.media : (data.customChannels?.media ? [data.customChannels.media] : []),
        stickers: Array.isArray(data.customChannels?.stickers) ? data.customChannels.stickers : (data.customChannels?.stickers ? [data.customChannels.stickers] : [])
      }
    };

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { logging: processedData } }, { upsert: true });

    logAction({
      label: "logging/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات اللوغات",
      details: {
        enabled: processedData.enabled,
        channels: summarizeConfig(processedData.channels as Record<string, unknown>),
        customChannels: summarizeConfig(processedData.customChannels as Record<string, unknown>)
      }
    });

    revalidatePath(`/dashboard/${guildId}/logging`);
  } catch (error) {
    logError("logging/save", error);
    throw error;
  }
}
