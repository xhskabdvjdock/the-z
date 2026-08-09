import { GuildMember, PermissionsBitField, PermissionResolvable } from "discord.js";
import { ICommandOverride } from "@thez/shared";
import { BotCommand } from "../types/command";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/** للحصول على صلاحيات العضو في روم محدد (أو الشاملة إن لم يتوفر الروم) */
function memberPermissionsFor(
  member: GuildMember,
  channel: { permissionsFor(m: GuildMember): PermissionsBitField | null } | null | undefined
): PermissionsBitField | null {
  if (channel && typeof channel.permissionsFor === "function") {
    return channel.permissionsFor(member) as PermissionsBitField | null;
  }
  return member.permissions;
}

/**
 * فحص صلاحيات Discord الخاص بالأمر (defaultMemberPermissions) — نفس السلوك الذي
 * تفرضه واجهة الـ Slash على Discord نفسها، ويُطبّق يدويًا هنا على مسار البادئة
 * (الذي لا يفرض Discord عليه شيئًا). مديري السيرفر (Administrator) معفون مثل Discord.
 *
 * ملاحظة: هذه دالة مستقلة تمامًا عن checkCommandPermission (الخاصة باللوحة) —
 * يُستدعيان معًا في مسار البادئة: أولاً قاعدة Discord ثم تخصيصات اللوحة.
 */
export function verifyCommandPermission(
  command: Pick<BotCommand, "defaultMemberPermissions">,
  member: GuildMember,
  channel?: any
): PermissionCheckResult {
  const required = command.defaultMemberPermissions;
  if (!required || !member) return { allowed: true };

  if (member.permissions.has("Administrator")) return { allowed: true };

  const channelPerms = memberPermissionsFor(member, channel);
  const has = channelPerms ? channelPerms.has(required as PermissionResolvable) : false;

  if (has) return { allowed: true };
  return {
    allowed: false,
    reason: "❌ لا تملك الصلاحيات الكافية لاستخدام هذا الأمر (صلاحية غير متوفرة في هذا الروم)."
  };
}

/** يتحقق مما إذا كان بإمكان عضو معيّن استخدام أمر ما في روم معيّن، بناءً على تخصيصات لوحة التحكم */
export function checkCommandPermission(
  override: ICommandOverride | undefined,
  member: GuildMember,
  channelId: string
): PermissionCheckResult {
  if (!override) return { allowed: true };

  if (!override.enabled) {
    return { allowed: false, reason: "❌ هذا الأمر معطّل حالياً في هذا السيرفر." };
  }

  if (override.deniedUserIds?.includes(member.id)) {
    return { allowed: false, reason: "❌ ليس لديك صلاحية استخدام هذا الأمر." };
  }

  if (override.deniedRoleIds?.length && member.roles.cache.hasAny(...override.deniedRoleIds)) {
    return { allowed: false, reason: "❌ رتبتك ممنوعة من استخدام هذا الأمر." };
  }

  if (override.deniedChannelIds?.includes(channelId)) {
    return { allowed: false, reason: "❌ لا يمكن استخدام هذا الأمر في هذا الروم." };
  }

  if (override.allowedChannelIds?.length && !override.allowedChannelIds.includes(channelId)) {
    return { allowed: false, reason: "❌ هذا الأمر غير مفعّل في هذا الروم." };
  }

  const hasRoleRestriction = override.allowedRoleIds?.length || override.allowedUserIds?.length;
  if (hasRoleRestriction) {
    const roleOk = override.allowedRoleIds?.some((r) => member.roles.cache.has(r));
    const userOk = override.allowedUserIds?.includes(member.id);
    if (!roleOk && !userOk && !member.permissions.has("Administrator")) {
      return { allowed: false, reason: "❌ ليس لديك صلاحية استخدام هذا الأمر." };
    }
  }

  return { allowed: true };
}
