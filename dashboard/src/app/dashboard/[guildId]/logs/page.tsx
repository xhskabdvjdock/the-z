import { ensureDb } from "@/lib/db";
import { ActionLog } from "@thez/shared";

export default async function LogsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const logs = await ActionLog.find({ guildId: params.guildId }).sort({ createdAt: -1 }).limit(100);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">سجل الإجراءات</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        آخر 100 إجراء تم تنفيذها من لوحة التحكم على هذا السيرفر.
      </p>

      {logs.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">لا توجد إجراءات مسجلة بعد.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-[#2A2D37] text-xs text-slate-400">
                <th className="px-3 py-2 font-medium">الوقت</th>
                <th className="px-3 py-2 font-medium">القسم</th>
                <th className="px-3 py-2 font-medium">المستخدم</th>
                <th className="px-3 py-2 font-medium">الإجراء</th>
                <th className="px-3 py-2 font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D37]">
              {logs.map((log) => (
                <tr key={log._id as string}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{log.label}</td>
                  <td className="px-3 py-2 text-xs text-[#F0F0F0]">
                    {log.userName ?? log.userId}
                    {log.userName && log.userName !== log.userId && (
                      <span className="mr-1 text-slate-500">({log.userId})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#F0F0F0]">{log.action}</td>
                  <td className="px-3 py-2">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <details className="text-xs text-slate-400">
                        <summary className="cursor-pointer text-slate-500">عرض التفاصيل</summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-[#1A1C23] p-2 text-[11px] leading-relaxed">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}