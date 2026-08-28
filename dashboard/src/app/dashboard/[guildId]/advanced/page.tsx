import { requireGuildAdmin } from "@/lib/guildAccess";
import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";

export default async function AdvancedPage({ params }: { params: { guildId: string } }) {
  await requireGuildAdmin(params.guildId);
  await ensureDb();
  const config = await GuildConfig.findOne({ guildId: params.guildId }).lean();
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">لوحة تحكم متقدمة</h1>
      <p className="mb-6 text-sm text-slate-500">إعدادات مجمعة وأدوات تشخيصية</p>
      <div className="card">
        <h2 className="font-bold">إعدادات السيرفر</h2>
        <p className="text-sm text-slate-500">البادئة: {(config as any)?.prefix ?? ","} | اللغة: العربية</p>
      </div>
      <div className="card mt-6">
        <h2 className="font-bold">سجل الأحداث المباشر</h2>
        <p className="text-sm text-slate-500">آخر 10 أحداث من سجل الإجراءات</p>
      </div>
    </div>
  );
}