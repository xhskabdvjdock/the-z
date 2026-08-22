import { IGuildDashboardRole } from "../types/guildConfig";

/** مستويات الوصول إلى لوحة التحكم (قابلة للتوسع بمراحل/أقسام لاحقًا) */
export type GuildAccessLevel = "owner" | "admin" | "dashboardRole" | "none";

export interface GuildAccessInput {
  /** هل المستخدم مالك السيرفر؟ */
  isOwner: boolean;
  /** هل للعضو صلاحية Administrator عبر Discord؟ */
  isAdministrator: boolean;
  /** هل إعداد اللوحة يسمح للمدراء (allowAdministrators)؟ */
  allowAdministrators: boolean;
  /** معرّف المستخدم */
  userId: string;
  /** رتب العضو في السيرفر (تُجلب من Discord) */
  memberRoleIds: string[];
  /** رتب اللوحة المخصصة من إعدادات السيرفر */
  dashboardRoles: IGuildDashboardRole[];
}

/**
 * القاعدة النقية لتحديد مستوى الوصول (بدون أي اعتماد خارجي — قابلة للاختبار).
 * ملاحظة أمنية: هذه الدالة تفترض أن العضو مثبت فعليًا داخل السيرفر قبل استدعائها.
 */
export function resolveGuildAccessLevel(input: GuildAccessInput): GuildAccessLevel {
  if (input.isOwner) return "owner";
  if (input.isAdministrator && input.allowAdministrators) return "admin";
  if (input.dashboardRoles.some((role) =>
    (role.userIds ?? []).includes(input.userId) ||
    (role.roleIds ?? []).some((roleId) => input.memberRoleIds.includes(roleId))
  )) {
    return "dashboardRole";
  }
  return "none";
}