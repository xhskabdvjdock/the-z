"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export async function saveCaptchaConfig(guildId: string, data: IGuildConfig["captcha"]) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { captcha: data } }, { upsert: true });

    logAction({
      label: "captcha/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات التحقق (Captcha)",
      details: summarizeConfig(data as unknown as Record<string, unknown>)
    });

    revalidatePath(`/dashboard/${guildId}/captcha`);
  } catch (error) {
    logError("captcha/save", error);
    throw error;
  }
}
