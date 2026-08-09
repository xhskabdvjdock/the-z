import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import {
  GuildConfig,
  resolveDashboardSettings,
  resolveGuildAccessLevel,
  isSnowflakeId
} from "@thez/shared";
import { authOptions } from "./auth";
import { ensureDb } from "./db";
import { getBotGuildIds, getGuildMember, getUserGuilds, hasAdminPermission } from "./discord";
import { logError } from "./logger";

/**
 * نقطة الحماية الوحيدة لمسارات /api/** Server-Side.
 *
 * تتحقق بالترتيب من:
 *  1) المصادقة (الجلسة سليمة وغير منتهية + توكن صالح بدون خطأ RefreshFailed)
 *  2) صحة معرّف السيرفر (Snowflake)
 *  3) وجود البوت في السيرفر
 *  4) عضوية المستخدم في السيرفر (من بيانات OAuth المحدثة)
 *  5) الصلاحيات:
 *     - مالك السيرفر → نعم (دائمًا)
 *     - Administrator (مع احترام guildConfig.dashboard.allowAdministrators)
 *     - رتب اللوحة المخصصة: user في السيرفر + يحمل رتبة/معرّف مذكور
 *  6) أي فشل → رد JSON برمز الحالة الصحيح (401/400/403/404/500)
 *
 * لا تُستخدم أي قيمة guildId قادمة من الـ Client كأساس للثقة — كل شيء يعاد التحقق منه.
 */

export type ApiGuildResult = { ok: true; userId: string } | { ok: false; response: NextResponse };

function fail(status: number, message: string): ApiGuildResult {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

export async function requireApiGuild(guildId: string): Promise<ApiGuildResult> {
  // 1) المصادقة
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return fail(401, "غير مصرح — سجّل الدخول أولاً");
  if ((session as any).error === "RefreshFailed") {
    return fail(401, "انتهت صلاحية الاتصال بديسكورد — سجّل الدخول مجدداً");
  }
  const userId = (session.user as any)?.id;
  if (!isSnowflakeId(userId)) return fail(401, "جلسة غير صالحة");

  // 2) صحة معرّف السيرفر
  if (!isSnowflakeId(guildId)) return fail(400, "معرّف السيرفر غير صالح");

  try {
    // 3) البوت داخل السيرفر
    const botGuildIds = await getBotGuildIds();
    if (!botGuildIds.has(guildId)) return fail(404, "السيرفر غير موجود أو البوت غير مضاف إليه");

    // 4) عضوية المستخدم (طلب محدث دون كاش لمنع الثغرات)
    const guilds = await getUserGuilds(session.accessToken, true);
    const target = guilds.find((g) => g.id === guildId);
    if (!target) return fail(403, "ليس لديك صلاحية الوصول لهذا السيرفر");

    // 5) الصلاحيات
    if (target.owner) return { ok: true, userId };

    const settings = await loadDashboardSettings(guildId);

    // رتب اللوحة المخصصة: العضو في السيرفر + يحمل رتبة أو معرّفًا
    let memberRoleIds: string[] = [];
    const member = await getGuildMember(guildId, userId);
    if (member) memberRoleIds = member.roles;

    const level = resolveGuildAccessLevel({
      isOwner: target.owner,
      isAdministrator: hasAdminPermission(target.permissions),
      allowAdministrators: settings.allowAdministrators !== false,
      userId,
      memberRoleIds,
      dashboardRoles: settings.roles
    });

    if (level === "owner" || level === "admin" || level === "dashboardRole") {
      return { ok: true, userId };
    }

    return fail(403, "ليس لديك صلاحية الوصول إلى إعدادات هذا السيرفر");
  } catch (err) {
    logError("api/guild/access", err);
    return fail(500, "حدث خطأ داخلي أثناء التحقق من الصلاحية");
  }
}

/** قراءة إعدادات لوحة التحكم من قاعدة البيانات (مع defaults آمنة) */
async function loadDashboardSettings(guildId: string) {
  await ensureDb();
  const config = await GuildConfig.findOne({ guildId });
  return resolveDashboardSettings(config);
}