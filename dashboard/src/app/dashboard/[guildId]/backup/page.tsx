import { ensureDb } from "@/lib/db";
import BackupForm from "./BackupForm";

export default async function BackupPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">نسخة احتياطية (Backup)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        قم بإنشاء نسخة احتياطية شاملة للسيرفر أو استعادة نسخة سابقة.
      </p>
      <BackupForm guildId={params.guildId} />
    </div>
  );
}
