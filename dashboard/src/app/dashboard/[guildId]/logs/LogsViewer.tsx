"use client";

import { useState, useEffect } from "react";
import { ILogEntry } from "@thez/shared/client";

export default function LogsViewer({ guildId }: { guildId: string }) {
  const [logs, setLogs] = useState<ILogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [guildId]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/guild/${guildId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = !filter ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.type.toLowerCase().includes(filter.toLowerCase()) ||
      log.executorTag?.toLowerCase().includes(filter.toLowerCase()) ||
      log.targetTag?.toLowerCase().includes(filter.toLowerCase()) ||
      log.reason?.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    return matchesFilter && matchesType;
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      moderation: "الإشراف",
      members: "الأعضاء",
      messages: "الرسائل",
      voice: "الصوت",
      actions: "الإجراءات",
      files: "الملفات",
      server: "السيرفر",
      roles: "الرتب",
      channels: "الرومات",
      other: "أخرى",
      invites: "الدعوات",
      gifblock: "حظر GIFs",
      suggestions: "الاقتراحات",
      access: "إدارة الوصول",
      leveling: "المستويات",
      jail: "السجن",
      reactionroles: "رولات الرياكشن"
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">سجلات السيرفر</h1>
        <button
          onClick={fetchLogs}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          تحديث
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="بحث في السجلات (الإجراء، المستخدم، السبب...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
        >
          <option value="all">جميع الأنواع</option>
          <option value="moderation">الإشراف</option>
          <option value="members">الأعضاء</option>
          <option value="messages">الرسائل</option>
          <option value="gifblock">حظر GIFs</option>
          <option value="suggestions">الاقتراحات</option>
          <option value="access">إدارة الوصول</option>
          <option value="leveling">المستويات</option>
          <option value="jail">السجن</option>
          <option value="reactionroles">رولات الرياكشن</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">لا توجد سجلات</div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log._id}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {getTypeLabel(log.type)}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString('ar-EG')}
                </span>
              </div>
              <div className="font-medium">{log.action}</div>

              {/* معلومات أساسية */}
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {log.executorTag && (
                  <div><strong>من قام:</strong> {log.executorTag}</div>
                )}
                {log.targetTag && (
                  <div><strong>المستهدف:</strong> {log.targetTag}</div>
                )}
                {log.reason && (
                  <div><strong>السبب:</strong> {log.reason}</div>
                )}
                {log.duration && (
                  <div><strong>المدة:</strong> {log.duration}</div>
                )}
                {log.channelName && (
                  <div><strong>القناة:</strong> {log.channelName}</div>
                )}
                {log.roleName && (
                  <div><strong>الرتبة:</strong> {log.roleName}</div>
                )}
              </div>

              {/* زر عرض التفاصيل */}
              {(log.details || log.before || log.after || log.messageUrl) && (
                <button
                  onClick={() => setExpandedLog(expandedLog === log._id ? null : (log._id || null))}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  {expandedLog === log._id ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                </button>
              )}

              {/* التفاصيل الموسعة */}
              {expandedLog === log._id && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm space-y-2">
                  {log.messageUrl && (
                    <div>
                      <strong>رابط الرسالة:</strong>
                      <a href={log.messageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                        {log.messageUrl}
                      </a>
                    </div>
                  )}
                  {log.before && (
                    <div>
                      <strong>قبل:</strong>
                      <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto">
                        {typeof log.before === 'string' ? log.before : JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div>
                      <strong>بعد:</strong>
                      <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto">
                        {typeof log.after === 'string' ? log.after : JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.details && (
                    <div>
                      <strong>تفاصيل إضافية:</strong>
                      <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}