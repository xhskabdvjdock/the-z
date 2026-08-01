import { requireSession } from "@/lib/guildAccess";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
        <a href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm font-bold">
            Z
          </span>
          <span className="hidden sm:inline">لوحة التحكم</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <span className="hidden text-sm font-medium text-slate-600 dark:text-slate-300 sm:inline">{session.user?.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
