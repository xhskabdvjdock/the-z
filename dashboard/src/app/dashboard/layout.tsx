import { requireSession } from "@/lib/guildAccess";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur-xl shadow-sm dark:border-slate-800/60 dark:bg-slate-900/80 sm:px-8">
        <a href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-500/25">
            Z
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">لوحة التحكم</span>
        </a>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/50">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{session.user?.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
