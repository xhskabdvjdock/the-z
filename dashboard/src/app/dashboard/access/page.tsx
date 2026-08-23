import { requireDashboardAccess } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { DashboardAccess, OWNER_ID } from "@thez/shared";
import AccessManager from "./AccessManager";

export default async function AccessPage() {
  await requireDashboardAccess();
  await ensureDb();

  const doc = await DashboardAccess.findOne({ id: "global" });
  const ids = doc?.allowedUserIds ?? [OWNER_ID];
  const effective = ids.includes(OWNER_ID) ? ids : [OWNER_ID, ...ids];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">إدارة الوصول للداشبورد</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        فقط المستخدمون في هذه القائمة يمكنهم تسجيل الدخول واستخدام لوحة التحكم، حتى لو كان البوت في سيرفرهم. المالك الأساسي لا يمكن إزالته.
      </p>
      <AccessManager initialIds={effective} ownerId={OWNER_ID} />
    </div>
  );
}