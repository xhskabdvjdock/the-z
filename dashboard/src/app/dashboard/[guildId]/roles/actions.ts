"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, IGuildConfig, buildRolePanelMessage } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";
import {
  getGuildRoles,
  getBotTopRolePosition,
  validateRolePanel,
  sendChannelMessage,
  editChannelMessage,
  getGuildInfo
} from "@/lib/discord";

export interface RolesConfigInput {
  autoRole: IGuildConfig["autoRole"];
  colors: IGuildConfig["colors"];
  selfRoles: IGuildConfig["selfRoles"];
}

export async function saveRolesConfig(guildId: string, data: RolesConfigInput) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { autoRole: data.autoRole, colors: data.colors, selfRoles: data.selfRoles } },
      { upsert: true }
    );

    logAction({
      label: "roles/save",
      guildId,
      guildName: (await getGuildInfo(guildId).catch(() => null))?.name,
      userId: (session.user as any).id,
      userName: session.user?.name,
      action: "حفظ إعدادات الرولات",
      details: {
        panels: data.selfRoles.length,
        panelsEnabled: data.selfRoles.filter((p) => p.enabled !== false).length,
        autoRoleEnabled: data.autoRole.enabled,
        autoRoleUsers: data.autoRole.userRoleIds.length,
        autoRoleBots: data.autoRole.botRoleIds.length,
        colorsEnabled: data.colors.enabled,
        colorsRoles: data.colors.roles.length
      }
    });

    revalidatePath(`/dashboard/${guildId}/roles`);
  } catch (error) {
    logError("roles/save", error);
    throw error;
  }
}

/**
 * نشر لوحة رتب (Publish) أو تحديث لوحة منشورة (Update):
 * - يتحقق من الصلاحيات: رتبة البوت، الهرمية، @everyone، الرتب المُدارة.
 * - يحفظ اللوحة المُعدلة في قاعدة البيانات.
 * - يعدّل نفس الرسالة إن كانت منشورة في نفس القناة، وإلا يرسل رسالة جديدة
 *   ويحفظ ChannelId + MessageId لتحديثها لاحقًا.
 */
export async function publishRolePanel(
  guildId: string,
  panel: IGuildConfig["selfRoles"][number]
) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    if (!panel.channelId) throw new Error("اختر القناة التي ستُنشر فيها اللوحة أولًا.");
    if (panel.options.length === 0) throw new Error("أضف رتبة واحدة على الأقل قبل النشر.");
    if (panel.enabled === false) throw new Error("اللوحة معطّلة — فعّلها ثم انشر.");

    // موقع الرسالة المنشورة حاليًا (للتحديث بدل الإرسال من جديد)
    const config = (await GuildConfig.findOne({ guildId }).lean()) as IGuildConfig | null;
    const dbPanel = config?.selfRoles?.find((p) => p.id === panel.id);

    // التحقق من صلاحية الرتب: @everyone / managed / أعلى من رتبة البوت
    const [roles, botTopPosition, guildInfo] = await Promise.all([
      getGuildRoles(guildId),
      getBotTopRolePosition(guildId),
      getGuildInfo(guildId).catch(() => null)
    ]);
    const issues = validateRolePanel(
      guildId,
      panel.options.map((o) => ({ roleId: o.roleId, label: o.label || o.roleId })),
      roles,
      botTopPosition
    );
    if (issues.length > 0) {
      throw new Error(`لا يمكن نشر اللوحة:\n- ${issues.join("\n- ")}`);
    }

    const payload = buildRolePanelMessage(panel);
    const panelSummary = {
      panelId: panel.id,
      title: panel.title || "(بدون عنوان)",
      type: panel.type,
      options: panel.options.length,
      maxRoles: panel.maxRoles ?? 0,
      channelId: panel.channelId
    };

    // تحديث الرسالة نفسها إن كانت موجودة في القناة نفسها
    if (dbPanel?.channelId === panel.channelId && dbPanel?.messageId) {
      const editResult = await editChannelMessage(dbPanel.channelId, dbPanel.messageId, payload);
      if (editResult.ok) {
        await GuildConfig.findOneAndUpdate(
          { guildId, "selfRoles.id": panel.id },
          { $set: { "selfRoles.$": { ...panel, messageId: dbPanel.messageId } } }
        );
        logAction({
          label: "roles/publish",
          guildId,
          guildName: guildInfo?.name,
          userId: (session.user as any).id,
          userName: session.user?.name,
          action: "تحديث لوحة رتب منشورة",
          details: { ...panelSummary, messageId: dbPanel.messageId, mode: "update" }
        });
        revalidatePath(`/dashboard/${guildId}/roles`);
        return { ok: true, updated: true };
      }
      if (editResult.status !== 404) {
        throw new Error(
          `لا يمكن تحديث الرسالة المنشورة (HTTP ${editResult.status}) — تحقق من صلاحية البوت في القناة.${editResult.error ? `\n${editResult.error}` : ""}`
        );
      }
      // 404 = الرسالة حُذفت — نرسل رسالة جديدة أدناه
    }

    const sendResult = await sendChannelMessage(panel.channelId, payload);
    if (!sendResult.ok || !sendResult.id) {
      throw new Error(
        `فشل إرسال اللوحة في القناة (HTTP ${sendResult.status}).${sendResult.error ? `\n${sendResult.error}` : ""}`
      );
    }

    await GuildConfig.findOneAndUpdate(
      { guildId, "selfRoles.id": panel.id },
      { $set: { "selfRoles.$": { ...panel, messageId: sendResult.id } } }
    );

    logAction({
      label: "roles/publish",
      guildId,
      guildName: guildInfo?.name,
      userId: (session.user as any).id,
      userName: session.user?.name,
      action: "نشر لوحة رتب",
      details: { ...panelSummary, messageId: sendResult.id, mode: "send" }
    });

    revalidatePath(`/dashboard/${guildId}/roles`);
    return { ok: true, updated: false };
  } catch (error) {
    logError("roles/publish", error);
    throw error;
  }
}
