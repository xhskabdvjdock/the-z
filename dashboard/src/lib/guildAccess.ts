import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import {
  GuildConfig,
  resolveDashboardSettings,
  resolveGuildAccessLevel,
  isSnowflakeId
} from "@thez/shared";
import { ensureDb } from "./db";
import {
  getBotGuildIds,
  getGuildMember,
  getUserGuilds,
  hasAdminPermission
} from "./discord";

/**
 * نقطة الحماية الوحيدة لصفحات/إجراءات اللوحة (Server Actions) داخل /dashboard/[guildId]/*.
 *
 * نفس منطق requireApiGuild تمامًا حتى لا تتفكك صلاحيات الوصول بين واجهات REST
 * والإجراءات من الصفحات:
 *  1) الجلسة سليمة + معرّف مستخدم صحيح
 *  2) معرّف السيرفر Snowflake
 *  3) البوت داخل السيرفر
 *  4) عضوية المستخدم (بيانات OAuth محدّثة — ليست مخزنة)
 *  5) الصلاحيات: مالك → Administrator (مع احترام allowAdministrators) → رتب اللوحة
 *  6) أي فشل → إعادة توجيه للوحة
 */
export async function requireGuildAdmin(guildId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    console.error("[guildAccess] لا جلسة ولا accessToken");
    redirect("/");
  }
  // فشل تجديد توكن ديسكورد → إجبار جلسة نظيفة جديدة بدل استمرار التدفق بصلاحية زائفة
  if ((session as any)?.error === "RefreshFailed") {
    console.error("[guildAccess] RefreshFailed — إعادة توجيه للدخول");
    redirect("/login");
  }
  const userId = (session.user as any)?.id;
  if (!userId || !isSnowflakeId(userId)) {
    console.error("[guildAccess] معرّف المستخدم غير صالح:", userId);
    redirect("/");
  }

  if (!isSnowflakeId(guildId)) {
    console.error("[guildAccess] معرّف السيرفر غير صالح:", guildId);
    redirect("/dashboard");
  }

  try {
    // البوت داخل السيرفر
    const botGuildIds = await getBotGuildIds();
    if (!botGuildIds.has(guildId)) {
      console.error(`[guildAccess] البوت غير داخل السيرفر ${guildId} (البوت في ${botGuildIds.size} سيرفر)`);
      redirect("/dashboard");
    }

    // عضوية المستخدم (بدون كاش)
    const guilds = await getUserGuilds(session.accessToken, true);
    const target = guilds.find((g) => g.id === guildId);
    if (!target) {
      console.error(`[guildAccess] المستخدم غير عضو في السيرفر ${guildId}`);
      redirect("/dashboard");
    }

    await ensureDb();
    const config = await GuildConfig.findOne({ guildId });
    const settings = resolveDashboardSettings(config);

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

    if (level === "none") {
      console.error(
        `[guildAccess] لا صلاحية للوحة: owner=${target.owner} admin=${hasAdminPermission(target.permissions)} roles=${memberRoleIds.join(",")}`
      );
      redirect("/dashboard");
    }
  } catch (err) {
    console.error("[guildAccess] خطأ أثناء الفحص:", err);
    redirect("/dashboard");
  }

  return session;
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/");
  if ((session as any)?.error === "RefreshFailed") redirect("/login");
  return session;
}