"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICommandOverride } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

export async function saveCommandOverrides(guildId: string, overrides: ICommandOverride[]) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { commandOverrides: overrides } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/commands`);
}

/**
 * الإعدادات العامة للسيرفر: بادئة الأوامر النصية + لون الإمبد الافتراضي.
 * التحقق يتم هنا (Server Action) لأن الواجهة وحدها ليست مصدر ثقة.
 */
export async function saveGeneralSettings(
  guildId: string,
  settings: { prefix: string; embedColor: string }
) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  const prefix = (settings.prefix ?? "").trim();
  if (!prefix || prefix.length > 5 || /\s/.test(prefix)) {
    throw new Error("البادئة غير صالحة: من 1 إلى 5 أحرف بدون مسافات");
  }

  const embedColor = (settings.embedColor ?? "").trim();
  if (embedColor && !/^#[0-9a-fA-F]{6}$/.test(embedColor)) {
    throw new Error("لون الإمبد غير صالح: يجب أن يكون بصيغة #RRGGBB");
  }

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { prefix, embedColor: embedColor || undefined } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/commands`);
  revalidatePath(`/dashboard/${guildId}`);
}

export async function saveModerationSettings(
  guildId: string,
  settings: { autoDeleteConfirmation: number }
) {
  await requireGuildAdmin(guildId);
  await ensureDb();

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { "moderation.autoDeleteConfirmation": settings.autoDeleteConfirmation } },
    { upsert: true }
  );

  revalidatePath(`/dashboard/${guildId}/commands`);
}
