"use client";

import { useState } from "react";
import { createBackup } from "./actions";
import { restoreBackup } from "./restoreActions";

interface BackupFormProps {
  guildId: string;
}

export default function BackupForm({ guildId }: BackupFormProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const backup = await createBackup(guildId);
      
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

    const confirmed = confirm(
      "هل أنت متأكد من استعادة النسخة الاحتياطية؟\n\n" +
      "⚠️ هذا سيقوم بحذف وإعادة إنشاء جميع الرتب والقنوات!\n" +
      "⚠️ هذه العملية لا رجعة فيها!\n\n" +
      "تأكد من إنشاء نسخة احتياطية جديدة قبل المتابعة."
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      const text = await backupFile.text();
      const backup = JSON.parse(text);
      
      const result = await restoreBackup(guildId, backup);
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
          سيتم إنشاء نسخة احتياطية شاملة تشمل جميع إعدادات السيرفر، الرتب، القنوات، وإعدادات البوت.
        </p>
        
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
          استعادة النسخة الاحتياطية سيعيد جميع الإعدادات، الرتب، والقنوات إلى الحالة المسجلة في الملف.
        </p>
        <p className="text-sm text-yellow-600">
          ملاحظة: عملية الاستعادة قد تستغرق بضع دقائق بسبب قيود Discord API.
        </p>
        
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
          استعادة النسخة الاحتياطية سيقوم بحذف وإعادة إنشاء جميع محتويات السيرفر، بما في ذلك:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-500 ml-4">
          <li>جميع الرتب والصلاحيات (ما عدا الرتب المدارة بواسطة البوتات الأخرى)</li>
          <li>جميع القنوات (النصية والصوتية والتصنيفات)</li>
          <li>إعدادات السيرفر الأساسية</li>
          <li>إعدادات البوت (Auto-Mod، التذاكر، إلخ)</li>
        </ul>
        <p className="text-sm text-gray-500">
          <strong>ملاحظة:</strong> هذه العملية لا رجعة فيها! يُنص دائماً بإنشاء نسخة احتياطية جديدة قبل الاستعادة.
        </p>
      </section>
    </div>
  );
}
