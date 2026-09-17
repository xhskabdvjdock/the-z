import { requireDashboardAccess } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { DashboardAccess, OWNER_ID } from "@thez/shared";
import AccessManager from "@/components/AccessManager";
import PageHeader from "@/components/PageHeader";

export default async function GuildAccessPage({ params }: { params: { guildId: string } }) {
  await requireDashboardAccess();
  await ensureDb();

  const doc = await DashboardAccess.findOne({ id: "global" });
  const ids = doc?.allowedUserIds ?? [OWNER_ID];
  const effective = ids.includes(OWNER_ID) ? ids : [OWNER_ID, ...ids];

  return (
    <div>
      <PageHeader
        title="إدارة الوصول للداشبورد"
        description="فقط المستخدمون في هذه القائمة يمكنهم تسجيل الدخول واستخدام لوحة التحكم في أي سيرفر."
      />
      <AccessManager initialIds={effective} ownerId={OWNER_ID} />
    </div>
  );
}