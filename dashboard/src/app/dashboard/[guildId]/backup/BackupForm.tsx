"use client";

import { useState } from "react";
import { createBackup } from "./actions";
import { restoreBackup } from "./restoreActions";
import { BackupOptions, RestoreOptions } from "@thez/shared";

interface BackupFormProps {
  guildId: string;
}

export default function BackupForm({ guildId }: BackupFormProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Backup options
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeRoles: true,
    includeChannels: true,
    includeBotConfig: true,
    includeGuildInfo: true
  });

  // Restore options
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    deleteExistingRoles: true,
    deleteExistingChannels: true,
    restoreRoles: true,
    restoreChannels: true,
    restoreBotConfig: true
  });

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const backup = await createBackup(guildId, backupOptions);
      
      // Download the backup as JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${guildId}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setLastBackup(backup.timestamp);
      alert("تم إنشاء النسخة الاحتياطية بنجاح");
    } catch (error) {
      alert("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
      console.error(error);
    }
    setLoading(false);
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      alert("الرجاء اختيار ملف النسخة الاحتياطية");
      return;
    }

    const actions: string[] = [];
    if (restoreOptions.deleteExistingRoles) actions.push("حذف الرتب القديمة");
    if (restoreOptions.deleteExistingChannels) actions.push("حذف القنوات القديمة");
    if (restoreOptions.restoreRoles) actions.push("استعادة الرتب");
    if (restoreOptions.restoreChannels) actions.push("استعادة القنوات");
    if (restoreOptions.restoreBotConfig) actions.push("استعادة إعدادات البوت");

    const destructive = restoreOptions.deleteExistingRoles || restoreOptions.deleteExistingChannels;
    const confirmed = confirm(
      `هل أنت متأكد من استعادة النسخة الاحتياطية؟\n\n` +
      `العمليات التي سيتم تنفيذها:\n` +
      actions.map(a => `• ${a}`).join("\n") +
      (destructive ? "\n\n⚠️ هذا سيقوم بحذف بيانات حالية! العملية لا رجعة فيها!" : "") +
      "\n\nتأكد من إنشاء نسخة احتياطية جديدة قبل المتابعة."
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      const text = await backupFile.text();
      const backup = JSON.parse(text);
      
      const result = await restoreBackup(guildId, backup, restoreOptions);
      alert(result.message);
    } catch (error) {
      alert("حدث خطأ أثناء استعادة النسخة الاحتياطية");
      console.error(error);
    }
    setRestoring(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">إنشاء نسخة احتياطية</h2>
        <p className="text-sm text-gray-500">
          اختر ما تريد نسخه احتياطياً من السيرفر:
        </p>
        
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backupOptions.includeRoles}
              onChange={(e) => setBackupOptions({ ...backupOptions, includeRoles: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">الرتب والصلاحيات</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backupOptions.includeChannels}
              onChange={(e) => setBackupOptions({ ...backupOptions, includeChannels: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">القنوات (النصية والصوتية)</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backupOptions.includeBotConfig}
              onChange={(e) => setBackupOptions({ ...backupOptions, includeBotConfig: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">إعدادات البوت</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backupOptions.includeGuildInfo}
              onChange={(e) => setBackupOptions({ ...backupOptions, includeGuildInfo: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">معلومات السيرفر</span>
          </label>
        </div>
        
        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "جاري إنشاء النسخة..." : "إنشاء نسخة احتياطية"}
        </button>

        {lastBackup && (
          <p className="text-sm text-gray-500">
            آخر نسخة احتياطية: {new Date(lastBackup).toLocaleString("ar-EG")}
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">استعادة نسخة احتياطية</h2>
        <p className="text-sm text-gray-500">
          اختر ما تريد استعادته من النسخة الاحتياطية:
        </p>
        <p className="text-sm text-yellow-600">
          ملاحظة: عملية الاستعادة قد تستغرق بضع دقائق بسبب قيود Discord API.
        </p>
        
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreOptions.deleteExistingRoles}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, deleteExistingRoles: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm text-red-600">حذف الرتب القديمة قبل الاستعادة</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreOptions.deleteExistingChannels}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, deleteExistingChannels: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm text-red-600">حذف القنوات القديمة قبل الاستعادة</span>
          </label>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreOptions.restoreRoles}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, restoreRoles: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">استعادة الرتب</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreOptions.restoreChannels}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, restoreChannels: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">استعادة القنوات</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreOptions.restoreBotConfig}
              onChange={(e) => setRestoreOptions({ ...restoreOptions, restoreBotConfig: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">استعادة إعدادات البوت</span>
          </label>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="label">اختر ملف النسخة الاحتياطية</label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
            className="input"
          />
        </div>

        <button
          onClick={handleRestoreBackup}
          disabled={restoring || !backupFile}
          className="btn btn-danger"
        >
          {restoring ? "جاري الاستعادة... (قد يستغرق بضع دقائق)" : "استعادة النسخة الاحتياطية"}
        </button>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">تحذير هام</h2>
        <p className="text-sm text-red-500">
          خيارات الحذف (الحمراء) هي عمليات مدمرة لا رجعة فيها!
        </p>
        <ul className="list-disc list-inside text-sm text-gray-500 ml-4">
          <li>حذف الرتب القديمة سيقوم بإزالة جميع الرتب (ما عدا الرتب المدارة بواسطة البوتات الأخرى)</li>
          <li>حذف القنوات القديمة سيقوم بإزالة جميع القنوات من السيرفر</li>
          <li>يمكنك استعادة إعدادات البوت فقط دون حذف أي شيء</li>
          <li>يمكنك إضافة رتب/قنوات جديدة دون حذف القديمة</li>
        </ul>
        <p className="text-sm text-gray-500">
          <strong>ملاحظة:</strong> يُنص دائماً بإنشاء نسخة احتياطية جديدة قبل الاستعادة.
        </p>
      </section>
    </div>
  );
}
