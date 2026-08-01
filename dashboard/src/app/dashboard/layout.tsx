import { requireSession } from "@/lib/guildAccess";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-4 sm:px-8">
        <a href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-white text-lg font-bold border border-gray-700">
            Z
          </div>
          <span className="text-lg font-bold text-white">لوحة التحكم</span>
        </a>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700">
            <span className="text-sm font-medium text-gray-300">{session.user?.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
