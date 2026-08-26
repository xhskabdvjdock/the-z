import { requireDashboardAccess } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { DashboardAccess, OWNER_ID } from "@thez/shared";
import AccessManager from "../../access/AccessManager";

export default async function GuildAccessPage({ params }: { params: { guildId: string } }) {
  await requireDashboardAccess();
  await ensureDb();

  const doc = await DashboardAccess.findOne({ id: "global" });
  const ids = doc?.allowedUserIds ?? [OWNER_ID];
  const effective = ids.includes(OWNER_ID) ? ids : [OWNER_ID, ...ids];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">إدارة الوصول للداشبورد</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        فقط المستخدمون في هذه القائمة يمكنهم تسجيل الدخول واستخدام لوحة التحكم في أي سيرفر.
      </p>
      <AccessManager initialIds={effective} ownerId={OWNER_ID} />
    </div>
  );
}