import { GuildMember } from "discord.js";
import { ICommandOverride } from "@thez/shared";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
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
