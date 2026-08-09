import { GuildConfig } from "@thez/shared";

/** أي رسالة يمكن حذفها (Message أو رد Interaction وهمي) */
type Deletable = { delete: (options?: any) => Promise<unknown> } | null | undefined;

/**
 * يجدول حذف رسالة التأكيد تلقائياً بعد autoDeleteConfirmation ثانية من
 * إعدادات السيرفر (الافتراضي 3). رسالة واحدة لكل الأوامر — لا تكرار.
 */
export async function scheduleAutoDelete(reply: Deletable, guildId: string): Promise<void> {
  if (!reply) return;

  let autoDeleteSeconds = 3;
  try {
    const config = await GuildConfig.findOne({ guildId });
    autoDeleteSeconds = config?.moderation?.autoDeleteConfirmation ?? 3;
  } catch {
    // لا نكسر تنفيذ الأمر إن فشل الجلب — نستعمل الافتراضي
  }

  if (autoDeleteSeconds <= 0) return;

  setTimeout(async () => {
    try {
      await reply.delete();
    } catch {
      // تجاهل إذا كانت الرسالة محذوفة بالفعل
    }
  }, autoDeleteSeconds * 1000);
}