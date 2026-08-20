"use server";

import { revalidatePath } from "next/cache";
import {
  GuildConfig,
  IGuildConfig,
  buildRolePanelMessage,
  COLOR_TEMPLATES,
  CUSTOM_TEMPLATE_ID,
  colorRoleName,
  IColorRole
} from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";
import {
  getGuildRoles,
  getBotTopRolePosition,
  validateRolePanel,
  sendChannelMessage,
  editChannelMessage,
  getGuildInfo,
  createGuildRole,
  deleteGuildRole
} from "@/lib/discord";

export interface RolesConfigInput {
  autoRole: IGuildConfig["autoRole"];
  colors: IGuildConfig["colors"];
  selfRoles: IGuildConfig["selfRoles"];
}

export interface ApplyColorTemplateInput {
  templateId: string;
  customHexes?: string[];
  anchorRoleId?: string;
  deleteExisting?: boolean;
}

/**
 * تطبيق قالب ألوان: ينشئ رتب الألوان في السيرفر تحت رتبة محددة (للترتيب)،
 * ويحذف رتب الألوان الحالية اختياريًا، ويحفظ النتيجة في إعدادات السيرفر.
 */
export async function applyColorTemplate(guildId: string, input: ApplyColorTemplateInput) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    const isCustom = input.templateId === CUSTOM_TEMPLATE_ID;
    const template = COLOR_TEMPLATES.find((t) => t.id === input.templateId);
    if (!isCustom && !template) throw new Error("القالب غير موجود.");

    const chosen: { hex: string; templateName: string }[] = isCustom
      ? (input.customHexes ?? []).map((hex) => ({ hex, templateName: "مخصص" }))
      : template!.colors.map((c) => ({ hex: c.hex, templateName: template!.name }));

    if (chosen.length === 0) throw new Error("اختر لونًا واحدًا على الأقل.");
    if (chosen.length > 25) throw new Error("الحد الأقصى للقالب المخصص هو 25 لونًا.");

    const [roles, botTopPosition, guildInfo, config] = await Promise.all([
      getGuildRoles(guildId),
      getBotTopRolePosition(guildId),
      getGuildInfo(guildId).catch(() => null),
      GuildConfig.findOne({ guildId }).lean()
    ]);

    // الرتبة المرجعية: تُنشأ رتب الألوان تحتها مباشرة
    const anchor = input.anchorRoleId ? roles.find((r) => r.id === input.anchorRoleId) : null;
    if (input.anchorRoleId && !anchor) throw new Error("الرتبة المحددة غير موجودة في السيرفر.");
    if (anchor && anchor.id === guildId) throw new Error("لا يمكن استخدام @everyone كرتبة مرجعية.");
    if (anchor && anchor.position >= botTopPosition) {
      throw new Error("الرتبة المحددة أعلى من أعلى رتبة يملكها البوت — أنزلها أولاً أو اختر رتبة أقل.");
    }

    // حذف رتب الألوان الحالية (اختياري)
    const existing = config?.colors?.roles ?? [];
    if (input.deleteExisting) {
      for (const cr of existing) {
        if (!cr.roleId) continue;
        const del = await deleteGuildRole(guildId, cr.roleId);
        if (!del.ok && del.status !== 404) {
          throw new Error(`تعذر حذف الرتبة "${cr.name}" (HTTP ${del.status}).`);
        }
      }
    }

    // إنشاء الرتب الجديدة تحت الرتبة المرجعية (أو في آخر الترتيب إن لم تُحدد)
    const basePosition = anchor ? anchor.position - 1 : null;
    const created: IColorRole[] = [];
    for (let i = 0; i < chosen.length; i++) {
      const { hex, templateName } = chosen[i];
      const name = colorRoleName(templateName, i);
      const body: Record<string, unknown> = {
        name,
        color: parseInt(hex, 16),
        hoist: false,
        mentionable: false
      };
      if (basePosition !== null) body.position = basePosition - i;

      const res = await createGuildRole(guildId, body);
      if (!res.ok || !res.role) {
        throw new Error(
          `تعذر إنشاء الرتبة "${name}" (HTTP ${res.status}) — تأكد أن البوت يملك صلاحية Manage Roles.${res.error ? `\n${res.error}` : ""}`
        );
      }
      created.push({ roleId: res.role.id, name, hex: `#${hex.toUpperCase()}`, allowedRoleIds: [] });
    }

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          "colors.templateId": input.templateId,
          "colors.anchorRoleId": input.anchorRoleId ?? null,
          "colors.customHexes": isCustom ? chosen.map((c) => c.hex) : [],
          "colors.roles": created
        }
      },
      { upsert: true }
    );

    logAction({
      label: "roles/apply-color-template",
      guildId,
      guildName: guildInfo?.name,
      userId: (session.user as any).id,
      userName: session.user?.name,
      action: "تطبيق قالب ألوان",
      details: {
        templateId: input.templateId,
        anchorRoleId: input.anchorRoleId ?? null,
        deleteExisting: !!input.deleteExisting,
        createdRoles: created.length,
        deletedRoles: input.deleteExisting ? existing.length : 0
      }
    });

    revalidatePath(`/dashboard/${guildId}/roles`);
    return { ok: true, roles: created, count: created.length };
  } catch (error) {
    logError("roles/apply-color-template", error);
    throw error;
  }
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
