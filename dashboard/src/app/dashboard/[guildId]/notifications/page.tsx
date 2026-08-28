import { ensureDb } from "@/lib/db";
import { Notification } from "@thez/shared";
import { requireGuildAdmin } from "@/lib/guildAccess";

export default async function NotificationsPage({ params }: { params: { guildId: string } }) {
  await requireGuildAdmin(params.guildId);
  await ensureDb();
  const notifications = await Notification.find({ guildId: params.guildId }).sort({ createdAt: -1 }).limit(20).lean();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الإشعارات</h1>
      <p className="mb-6 text-sm text-slate-500">آخر الأحداث المهمة</p>
      <div className="card flex flex-col gap-3">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">لا توجد إشعارات</p>
        ) : (
          notifications.map((n: any) => (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex-1">
                <p className="text-sm font-bold">{n.title}</p>
                <p className="text-xs text-slate-500">{n.message}</p>
                <p className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${n.type === "moderation" ? "bg-[#EF4444] text-white" : n.type === "suggestion" ? "bg-[#5865F2] text-white" : "bg-slate-200"}`}>{n.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}