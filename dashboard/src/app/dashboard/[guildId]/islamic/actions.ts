"use server";

import { revalidatePath } from "next/cache";
import {
  GuildConfig,
  normalizeAzkarCategories,
  normalizeContentTypes,
  normalizeHadithSources
} from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";
import { sendChannelMessage } from "@/lib/discord";

export interface IslamicConfigInput {
  enabled: boolean;
  channelId: string;
  intervalMinutes: number;
  contentTypes: string[];
  allowedSources: string[];
  azkarCategories: string[];
  antiRepeatMinutes: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export async function saveIslamicConfig(guildId: string, data: IslamicConfigInput) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    // نحافظ على سجل منع التكرار الحالي (حالة تشغيلية وليست إعدادًا يدخله المسؤول)
    const existing = await GuildConfig.findOne({ guildId }).lean();
    const recentlySent = existing?.islamicContent?.recentlySent ?? [];

    const islamicContent = {
      enabled: Boolean(data.enabled),
      channelId: data.channelId || null,
      intervalMinutes: clamp(data.intervalMinutes, 15, 1440),
      contentTypes: normalizeContentTypes(data.contentTypes),
      allowedSources: normalizeHadithSources(data.allowedSources),
      azkarCategories: normalizeAzkarCategories(data.azkarCategories),
      antiRepeatMinutes: clamp(data.antiRepeatMinutes, 1, 2880),
      recentlySent,
      nextRunAt: existing?.islamicContent?.nextRunAt,
      lastPosted: existing?.islamicContent?.lastPosted
    };

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { islamicContent } },
      { upsert: true }
    );

    logAction({
      label: "islamic/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الأذكار والمحتوى الإسلامي",
      details: {
        enabled: islamicContent.enabled,
        channelId: islamicContent.channelId,
        intervalMinutes: islamicContent.intervalMinutes,
        contentTypes: islamicContent.contentTypes,
        allowedSources: islamicContent.allowedSources,
        azkarCategoriesCount: islamicContent.azkarCategories.length,
        antiRepeatMinutes: islamicContent.antiRepeatMinutes
      }
    });

    revalidatePath(`/dashboard/${guildId}/islamic`);
  } catch (error) {
    logError("islamic/save", error);
    throw error;
  }
}

export async function testIslamicChannel(guildId: string) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    const config = await GuildConfig.findOne({ guildId }).lean();
    const channelId = config?.islamicContent?.channelId;
    if (!channelId) throw new Error("حدد قناة النشر أولاً.");

    const result = await sendChannelMessage(channelId, {
      content:
        "منشور اختبار: نظام الأذكار والمحتوى الإسلامي يعمل، وسيبدأ النشر التلقائي حسب الإعدادات المحفوظة."
    });
    if (!result.ok) {
      throw new Error(
        `تعذر إرسال رسالة الاختبار (HTTP ${result.status}) — تأكد أن البوت يملك صلاحية إرسال الرسائل في القناة.`
      );
    }

    logAction({
      label: "islamic/test",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "إرسال منشور اختبار لقناة الأذكار",
      details: { channelId }
    });

    revalidatePath(`/dashboard/${guildId}/islamic`);
  } catch (error) {
    logError("islamic/test", error);
    throw error;
  }
}