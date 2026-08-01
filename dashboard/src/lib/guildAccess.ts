import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { assertGuildAccess } from "./discord";

/**
 * يتحقق من تسجيل دخول المستخدم وامتلاكه صلاحية Administrator على السيرفر المطلوب.
 * يُستخدم في أعلى كل صفحة/فعل خادم (Server Action) داخل مسارات /dashboard/[guildId]/*.
 */
export async function requireGuildAdmin(guildId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/");
  }

  const allowed = await assertGuildAccess(session.accessToken, guildId);
  if (!allowed) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/");
  }
  return session;
}
